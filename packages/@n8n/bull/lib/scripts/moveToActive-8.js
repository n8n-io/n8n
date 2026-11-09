'use strict';
const content = `--[[
  Move next job to be processed to active, lock it and fetch its data. The job
  may be delayed, in that case we need to move it to the delayed set instead.
  This operation guarantees that the worker owns the job during the locks
  expiration time. The worker is responsible of keeping the lock fresh
  so that no other worker picks this job again.
  Input:
      KEYS[1] wait key
      KEYS[2] active key
      KEYS[3] priority key
      KEYS[4] active event key
      KEYS[5] stalled key
      -- Rate limiting
      KEYS[6] rate limiter key
      KEYS[7] delayed key
      --
      KEYS[8] drained key
      ARGV[1] key prefix
      ARGV[2] lock token
      ARGV[3] lock duration in milliseconds
      ARGV[4] timestamp
      ARGV[5] optional jobid
      ARGV[6] optional jobs per time unit (rate limiter)
      ARGV[7] optional time unit (rate limiter)
      ARGV[8] optional do not do anything with job if rate limit hit
      ARGV[9] optional rate limit by key
]]
local rcall = redis.call
local rateLimit = function(jobId, maxJobs)
  local rateLimiterKey = KEYS[6];
  local limiterIndexTable = rateLimiterKey .. ":index"
  -- Rate limit by group?
  if(ARGV[9]) then
    local group = string.match(jobId, "[^:]+$")
    if group ~= nil then
      rateLimiterKey = rateLimiterKey .. ":" .. group
    end
  end
  -- -- key for storing rate limited jobs
  -- When a job has been previously rate limited it should be part of this set
  -- if the job is back here means that the delay time for this job has passed and now we should
  -- be able to process it again.
  local limitedSetKey = rateLimiterKey .. ":limited"
  local delay = 0
  -- -- Check if job was already limited
  local isLimited = rcall("SISMEMBER", limitedSetKey, jobId);
  if isLimited == 1 then
     -- Remove from limited zset since we are going to try to process it
     rcall("SREM", limitedSetKey, jobId)
     rcall("HDEL", limiterIndexTable, jobId)
  else
    -- If not, check if there are any limited jobs
    -- If the job has not been rate limited, we should check if there are any other rate limited jobs, because if that
    -- is the case we do not want to process this job, just calculate a delay for it and put it to "sleep".
    local numLimitedJobs = rcall("SCARD", limitedSetKey)
    if numLimitedJobs > 0 then
      -- Note, add some slack to compensate for drift.
      delay = ((numLimitedJobs * ARGV[7] * 1.1) /  maxJobs) + tonumber(rcall("PTTL", rateLimiterKey))
    end
  end
  local jobCounter = tonumber(rcall("GET", rateLimiterKey))
  if(jobCounter == nil) then
    jobCounter = 0
  end
  -- check if rate limit hit
  if (delay == 0) and (jobCounter >= maxJobs) then
    -- Seems like there are no current rated limited jobs, but the jobCounter has exceeded the number of jobs for this unit of time so we need to rate limit this job.
    local exceedingJobs = jobCounter - maxJobs
    delay = tonumber(rcall("PTTL", rateLimiterKey)) + ((exceedingJobs) * ARGV[7]) / maxJobs
  end
  if delay > 0 then
    local bounceBack = ARGV[8]
    if bounceBack == 'false' then
      local timestamp = delay + tonumber(ARGV[4])
      -- put job into delayed queue
      rcall("ZADD", KEYS[7], timestamp * 0x1000 + bit.band(jobCounter, 0xfff), jobId)
      rcall("PUBLISH", KEYS[7], timestamp)
      rcall("SADD", limitedSetKey, jobId)
      -- store index so that we can delete rate limited data
      rcall("HSET", limiterIndexTable, jobId, limitedSetKey)
    end
    -- remove from active queue
    rcall("LREM", KEYS[2], 1, jobId)
    return true
  else
    -- false indicates not rate limited
    -- increment jobCounter only when a job is not rate limited
    if (jobCounter == 0) then
      rcall("PSETEX", rateLimiterKey, ARGV[7], 1)
    else
      rcall("INCR", rateLimiterKey)
    end
    return false
  end
end
local jobId = ARGV[5]
if jobId ~= '' then
  -- clean stalled key
  rcall("SREM", KEYS[5], jobId)
else
  -- move from wait to active
  jobId = rcall("RPOPLPUSH", KEYS[1], KEYS[2])
end
if jobId then
  -- Check if we need to perform rate limiting.
  local maxJobs = tonumber(ARGV[6])
  if maxJobs then
    if rateLimit(jobId, maxJobs) then
       return
    end
  end
  -- get a lock
  local jobKey = ARGV[1] .. jobId
  local lockKey = jobKey .. ':lock'
  rcall("SET", lockKey, ARGV[2], "PX", ARGV[3])
  -- remove from priority
  rcall("ZREM", KEYS[3], jobId)
  rcall("PUBLISH", KEYS[4], jobId)
  rcall("HSET", jobKey, "processedOn", ARGV[4])
  return {rcall("HGETALL", jobKey), jobId} -- get job data
else
  rcall("PUBLISH", KEYS[8], "")
end
`;
module.exports = {
  name: 'moveToActive',
  content,
  keys: 8,
};
