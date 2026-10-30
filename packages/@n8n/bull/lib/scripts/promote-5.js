'use strict';
const content = `--[[
  Promotes a job that is currently "delayed" to the "waiting" state
     Input:
      KEYS[1] 'delayed'
      KEYS[2] 'wait'
      KEYS[3] 'paused'
      KEYS[4] 'meta-paused'
      KEYS[5] 'priority'
      ARGV[1]  queue.toKey('')
      ARGV[2]  jobId
      ARGV[3]  queue token
     Events:
      'waiting'
]]
local rcall = redis.call;
local jobId = ARGV[2]
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
if rcall("ZREM", KEYS[1], jobId) == 1 then
  local priority = tonumber(rcall("HGET", ARGV[1] .. jobId, "priority")) or 0
  local target = getTargetQueueList(KEYS[4], KEYS[2], KEYS[3])
  if priority == 0 then
    -- LIFO or FIFO
    rcall("LPUSH", target, jobId)
  else
    addJobWithPriority(KEYS[5], priority, jobId, target)
  end
  -- Emit waiting event (wait..ing@token)
  rcall("PUBLISH", KEYS[2] .. "ing@" .. ARGV[3], jobId)
  rcall("HSET", ARGV[1] .. jobId, "delay", 0)
  return 0
else
  return -1
end
`;
module.exports = {
  name: 'promote',
  content,
  keys: 5,
};
