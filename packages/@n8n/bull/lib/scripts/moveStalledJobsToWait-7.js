'use strict';
const content = `--[[
  Move stalled jobs to wait.
    Input:
      KEYS[1] 'stalled' (SET)
      KEYS[2] 'wait',   (LIST)
      KEYS[3] 'active', (LIST)
      KEYS[4] 'failed', (ZSET)
      KEYS[5] 'stalled-check', (KEY)
      KEYS[6] 'meta-paused', (KEY)
      KEYS[7] 'paused', (LIST)
      ARGV[1]  Max stalled job count
      ARGV[2]  queue.toKey('')
      ARGV[3]  timestamp
      ARGV[4]  max check time
    Events:
      'stalled' with stalled job id.
]]
local rcall = redis.call
-- Includes
--[[
  Function to loop in batches.
  Just a bit of warning, some commands as ZREM
  could receive a maximum of 7000 parameters per call.
]]
local function batches(n, batchSize)
  local i = 0
  return function()
    local from = i * batchSize + 1
    i = i + 1
    if (from <= n) then
      local to = math.min(from + batchSize - 1, n)
      return from, to
    end
  end
end
--[[
  Function to check for the meta.paused key to decide if we are paused or not
  (since an empty list and !EXISTS are not really the same).
]]
local function getTargetQueueList(queueMetaKey, waitKey, pausedKey)
  if rcall("EXISTS", queueMetaKey) ~= 1 then
    return waitKey, false
  else
    return pausedKey, true
  end
end
--[[
  Function to remove debounce key if needed.
]]
local function removeDebounceKeyIfNeeded(prefixKey, debounceId)
  if debounceId then
    local debounceKey = prefixKey .. "de:" .. debounceId
    local pttl = rcall("PTTL", debounceKey)
    if pttl == 0 or pttl == -1 then
      rcall("DEL", debounceKey)
    end
  end
end
local function removeJob(jobId, baseKey)
  local jobKey = baseKey .. jobId
  rcall("DEL", jobKey, jobKey .. ':logs')
end
local function removeJobsByMaxAge(timestamp, maxAge, targetSet, prefix)
  local start = timestamp - maxAge * 1000
  local jobIds = rcall("ZREVRANGEBYSCORE", targetSet, start, "-inf")
  for i, jobId in ipairs(jobIds) do
    removeJob(jobId, prefix)
  end
  rcall("ZREMRANGEBYSCORE", targetSet, "-inf", start)
end
local function removeJobsByMaxCount(maxCount, targetSet, prefix)
  local start = maxCount
  local jobIds = rcall("ZREVRANGE", targetSet, start, -1)
  for i, jobId in ipairs(jobIds) do
    removeJob(jobId, prefix)
  end
  rcall("ZREMRANGEBYRANK", targetSet, 0, -(maxCount + 1))
end
-- Check if we need to check for stalled jobs now.
if rcall("EXISTS", KEYS[5]) == 1 then
  return {{}, {}}
end
rcall("SET", KEYS[5], ARGV[3], "PX", ARGV[4])
-- Move all stalled jobs to wait
local stalling = rcall('SMEMBERS', KEYS[1])
local stalled = {}
local failed = {}
if(#stalling > 0) then
  rcall('DEL', KEYS[1])
  local MAX_STALLED_JOB_COUNT = tonumber(ARGV[1])
  -- Remove from active list
  for i, jobId in ipairs(stalling) do
    local jobKey = ARGV[2] .. jobId
    -- Check that the lock is also missing, then we can handle this job as really stalled.
    if(rcall("EXISTS", jobKey .. ":lock") == 0) then
      --  Remove from the active queue.
      local removed = rcall("LREM", KEYS[3], 1, jobId)
      if(removed > 0) then
        -- If this job has been stalled too many times, such as if it crashes the worker, then fail it.
        local stalledCount = rcall("HINCRBY", jobKey, "stalledCounter", 1)
        if(stalledCount > MAX_STALLED_JOB_COUNT) then
          local jobAttributes = rcall("HMGET", jobKey, "opts", "deid")
          local opts = cjson.decode(jobAttributes[1])
          local removeOnFailType = type(opts["removeOnFail"])
          rcall("ZADD", KEYS[4], ARGV[3], jobId)
          rcall("HMSET", jobKey, "failedReason", "job stalled more than allowable limit",
            "finishedOn", ARGV[3])
          removeDebounceKeyIfNeeded(ARGV[2], jobAttributes[2])
          rcall("PUBLISH", KEYS[4],  '{"jobId":"' .. jobId .. '", "val": "job stalled more than maxStalledCount"}')
          if removeOnFailType == "number" then
            removeJobsByMaxCount(opts["removeOnFail"],
                KEYS[4], ARGV[2])
          elseif removeOnFailType == "boolean" then
            if opts["removeOnFail"] then
              removeJob(jobId, ARGV[2])
              rcall("ZREM", KEYS[4], jobId)
            end
          elseif removeOnFailType ~= "nil" then
            local maxAge = opts["removeOnFail"]["age"]
            local maxCount = opts["removeOnFail"]["count"]
            if maxAge ~= nil then
              removeJobsByMaxAge(ARGV[3], maxAge,
                KEYS[4], ARGV[2])
            end
            if maxCount ~= nil and maxCount > 0 then
              removeJobsByMaxCount(maxCount, KEYS[4],
                ARGV[2])
            end
          end
          table.insert(failed, jobId)
        else
          local target = getTargetQueueList(KEYS[6], KEYS[2], KEYS[7])
          -- Move the job back to the wait queue, to immediately be picked up by a waiting worker.
          rcall("RPUSH", target, jobId)
          rcall('PUBLISH', KEYS[1] .. '@', jobId)
          table.insert(stalled, jobId)
        end
      end
    end
  end
end
-- Mark potentially stalled jobs
local active = rcall('LRANGE', KEYS[3], 0, -1)
if (#active > 0) then
  for from, to in batches(#active, 7000) do
    rcall('SADD', KEYS[1], unpack(active, from, to))
  end
end
return {failed, stalled}
`;
module.exports = {
  name: 'moveStalledJobsToWait',
  content,
  keys: 7,
};
