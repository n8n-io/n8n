'use strict';
const content = `--[[
  Retries a failed job by moving it back to the wait queue.
    Input:
      KEYS[1] 'active',
      KEYS[2] 'wait'
      KEYS[3] jobId key
      KEYS[4] 'meta-paused'
      KEYS[5] 'paused'
      KEYS[6] stalled key
      KEYS[7] 'priority'
      ARGV[1]  pushCmd
      ARGV[2]  jobId
      ARGV[3]  token
    Events:
      'prefix:added'
    Output:
     0  - OK
     -1 - Missing key
     -2 - Job Not locked
     -3 - Job not in active set
]]
local rcall = redis.call
-- Includes
--[[
  Function to add job considering priority.
]]
local function addJobWithPriority(priorityKey, priority, jobId, targetKey)
  rcall("ZADD", priorityKey, priority, jobId)
  local count = rcall("ZCOUNT", priorityKey, 0, priority)
  local len = rcall("LLEN", targetKey)
  local id = rcall("LINDEX", targetKey, len - (count - 1))
  if id then
    rcall("LINSERT", targetKey, "BEFORE", id, jobId)
  else
    rcall("RPUSH", targetKey, jobId)
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
if rcall("EXISTS", KEYS[3]) == 1 then
  local errorCode = removeLock(KEYS[3], KEYS[6], ARGV[3], ARGV[2])
  if errorCode < 0 then
    return errorCode
  end
  local numRemovedElements = rcall("LREM", KEYS[1], -1, ARGV[2])
  if numRemovedElements < 1 then return -3 end
  local target = getTargetQueueList(KEYS[4], KEYS[2], KEYS[5])
  local priority = tonumber(rcall("HGET", KEYS[3], "priority")) or 0
  if priority == 0 then
    -- LIFO or FIFO
    rcall(ARGV[1], target, ARGV[2])
  else
    addJobWithPriority(KEYS[7], priority, ARGV[2], target)
  end
  return 0
else
  return -1
end
`;
module.exports = {
  name: 'retryJob',
  content,
  keys: 7,
};
