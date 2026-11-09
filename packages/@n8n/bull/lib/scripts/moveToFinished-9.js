'use strict';
const content = `--[[
  Move job from active to a finished status (completed or failed)
  A job can only be moved to completed if it was active.
  The job must be locked before it can be moved to a finished status,
  and the lock must be released in this script.
     Input:
      KEYS[1] active key
      KEYS[2] completed/failed key
      KEYS[3] jobId key
      KEYS[4] wait key
      KEYS[5] priority key
      KEYS[6] active event key
      KEYS[7] delayed key
      KEYS[8] stalled key
      KEYS[9] metrics key
      ARGV[1]  jobId
      ARGV[2]  timestamp
      ARGV[3]  msg property
      ARGV[4]  return value / failed reason
      ARGV[5]  token
      ARGV[6]  shouldRemove
      ARGV[7]  event data (? maybe just send jobid).
      ARGV[8]  should fetch next job
      ARGV[9]  base key
      ARGV[10] lock token
      ARGV[11] lock duration in milliseconds
      ARGV[12] maxMetricsSize
     Output:
      0 OK
      -1 Missing key.
      -2 Missing lock.
      -3 - Job not in active set.
     Events:
      'completed/failed'
]]
local rcall = redis.call
-- Includes
--[[
  Functions to collect metrics based on a current and previous count of jobs.
  Granualarity is fixed at 1 minute.
]]
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
local function collectMetrics(metaKey, dataPointsList, maxDataPoints, timestamp)
    -- Increment current count
    local count = rcall("HINCRBY", metaKey, "count", 1) - 1
    -- Compute how many data points we need to add to the list, N.
    local prevTS = rcall("HGET", metaKey, "prevTS")
    if not prevTS then
        -- If prevTS is nil, set it to the current timestamp
        rcall("HSET", metaKey, "prevTS", timestamp, "prevCount", 0)
        return
    end
    local N = math.min(math.floor(timestamp / 60000) - math.floor(prevTS / 60000), tonumber(maxDataPoints))
    if N > 0 then
        local delta = count - rcall("HGET", metaKey, "prevCount")
        -- If N > 1, add N-1 zeros to the list
        if N > 1 then
            local points = {}
            points[1] = delta
            for i = 2, N do points[i] = 0 end
            for from, to in batches(#points, 7000) do
                rcall("LPUSH", dataPointsList, unpack(points, from, to))
            end
        else
            -- LPUSH delta to the list
            rcall("LPUSH", dataPointsList, delta)
        end
        -- LTRIM to keep list to its max size
        rcall("LTRIM", dataPointsList, 0, maxDataPoints - 1)
        -- update prev count with current count
        rcall("HSET", metaKey, "prevCount", count, "prevTS", timestamp)
    end
end
local function removeLock(jobKey, stalledKey, token, jobId)
  if token ~= "0" then
    local lockKey = jobKey .. ':lock'
    local lockToken = rcall("GET", lockKey)
    if lockToken == token then
      rcall("DEL", lockKey)
      rcall("SREM", stalledKey, jobId)
    else
      if lockToken then
        -- Lock exists but token does not match
        return -6
      else
        -- Lock is missing completely
        return -2
      end
    end
  end
  return 0
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
if rcall("EXISTS", KEYS[3]) == 1 then -- // Make sure job exists
    local errorCode = removeLock(KEYS[3], KEYS[8], ARGV[5], ARGV[1])
    if errorCode < 0 then
        return errorCode
    end
    -- Remove from active list (if not active we shall return error)
    local numRemovedElements = rcall("LREM", KEYS[1], -1, ARGV[1])
    if numRemovedElements < 1 then return -3 end
    local debounceId = rcall("HGET", KEYS[3], "deid")
    removeDebounceKeyIfNeeded(ARGV[9], debounceId)
    -- Remove job?
    local keepJobs = cmsgpack.unpack(ARGV[6])
    local maxCount = keepJobs['count']
    local maxAge = keepJobs['age']
    local targetSet = KEYS[2]
    local timestamp = ARGV[2]
    if maxCount ~= 0 then
        -- Add to complete/failed set
        rcall("ZADD", targetSet, timestamp, ARGV[1])
        rcall("HMSET", KEYS[3], ARGV[3], ARGV[4], "finishedOn", timestamp) -- "returnvalue" / "failedReason" and "finishedOn"
        local function removeJobs(jobIds)
            for i, jobId in ipairs(jobIds) do
                local jobKey = ARGV[9] .. jobId
                local jobLogKey = jobKey .. ':logs'
                rcall("DEL", jobKey, jobLogKey)
            end
        end
        -- Remove old jobs?
        if maxAge ~= nil then
            local start = timestamp - maxAge * 1000
            local jobIds = rcall("ZREVRANGEBYSCORE", targetSet, start, "-inf")
            removeJobs(jobIds)
            rcall("ZREMRANGEBYSCORE", targetSet, "-inf", start)
        end
        if maxCount ~= nil and maxCount > 0 then
            local start = maxCount
            local jobIds = rcall("ZREVRANGE", targetSet, start, -1)
            removeJobs(jobIds)
            rcall("ZREMRANGEBYRANK", targetSet, 0, -(maxCount + 1));
        end
    else
        local jobLogKey = KEYS[3] .. ':logs'
        rcall("DEL", KEYS[3], jobLogKey)
    end
    -- Collect metrics
    if ARGV[12] ~= "" then
      collectMetrics(KEYS[9], KEYS[9]..':data', ARGV[12], timestamp)
    end
    rcall("PUBLISH", targetSet, ARGV[7])
    -- Try to get next job to avoid an extra roundtrip if the queue is not closing, 
    -- and not rate limited.
    if (ARGV[8] == "1") then
        -- move from wait to active 
        local jobId = rcall("RPOPLPUSH", KEYS[4], KEYS[1])
        if jobId then
            local jobKey = ARGV[9] .. jobId
            local lockKey = jobKey .. ':lock'
            -- get a lock
            rcall("SET", lockKey, ARGV[11], "PX", ARGV[10])
            rcall("ZREM", KEYS[5], jobId) -- remove from priority
            rcall("PUBLISH", KEYS[6], jobId)
            rcall("HSET", jobKey, "processedOn", ARGV[2])
            return {rcall("HGETALL", jobKey), jobId} -- get job data
        end
    end
    return 0
else
    return -1
end
`;
module.exports = {
  name: 'moveToFinished',
  content,
  keys: 9,
};
