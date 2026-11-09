'use strict';
const content = `--[[
  Adds a job to the queue by doing the following:
    - Increases the job counter if needed.
    - Creates a new job key with the job data.
    - if delayed:
      - computes timestamp.
      - adds to delayed zset.
      - Emits a global event 'delayed' if the job is delayed.
    - if not delayed
      - Adds the jobId to the wait/paused list in one of three ways:
         - LIFO
         - FIFO
         - prioritized.
      - Adds the job to the "added" list so that workers gets notified.
    Input:
      KEYS[1] 'wait',
      KEYS[2] 'paused'
      KEYS[3] 'meta-paused'
      KEYS[4] 'id'
      KEYS[5] 'delayed'
      KEYS[6] 'priority'
      ARGV[1]  key prefix,
      ARGV[2]  custom id (will not generate one automatically)
      ARGV[3]  name
      ARGV[4]  data (json stringified job data)
      ARGV[5]  opts (json stringified job opts)
      ARGV[6]  timestamp
      ARGV[7]  delay
      ARGV[8]  delayedTimestamp
      ARGV[9]  priority
      ARGV[10] LIFO
      ARGV[11] token
      ARGV[12] debounce key
      ARGV[13] debounceId
      ARGV[14] debounceTtl
]]
local jobId
local jobIdKey
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
  Function to debounce a job.
]]
local function debounceJob(prefixKey, debounceId, ttl, jobId, debounceKey, token)
  if debounceId ~= "" then
    local debounceKeyExists
    if ttl ~= "" then
      debounceKeyExists = not rcall('SET', debounceKey, jobId, 'PX', ttl, 'NX')
    else
      debounceKeyExists = not rcall('SET', debounceKey, jobId, 'NX')
    end
    if debounceKeyExists then
      local currentDebounceJobId = rcall('GET', debounceKey)
      rcall("PUBLISH", prefixKey .. "debounced@" .. token, currentDebounceJobId)
      return currentDebounceJobId
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
local jobCounter = rcall("INCR", KEYS[4])
if ARGV[2] == "" then
  jobId = jobCounter
  jobIdKey = ARGV[1] .. jobId
else
  jobId = ARGV[2]
  jobIdKey = ARGV[1] .. jobId
  if rcall("EXISTS", jobIdKey) == 1 then
    rcall("PUBLISH", ARGV[1] .. "duplicated@" .. ARGV[11], jobId)
    return jobId .. "" -- convert to string
  end
end
local debounceKey = ARGV[12]
local opts = cmsgpack.unpack(ARGV[5])
local debouncedJobId = debounceJob(ARGV[1], ARGV[13], ARGV[14],
  jobId, debounceKey, ARGV[11])
if debouncedJobId then
  return debouncedJobId
end
local debounceId = ARGV[13]
local optionalValues = {}
if debounceId ~= "" then
  table.insert(optionalValues, "deid")
  table.insert(optionalValues, debounceId)
end
    -- Store the job.
rcall("HMSET", jobIdKey, "name", ARGV[3], "data", ARGV[4], "opts", opts, "timestamp",
  ARGV[6], "delay", ARGV[7], "priority", ARGV[9], unpack(optionalValues))
-- Check if job is delayed
local delayedTimestamp = tonumber(ARGV[8])
if(delayedTimestamp ~= 0) then
  local timestamp = delayedTimestamp * 0x1000 + bit.band(jobCounter, 0xfff)
  rcall("ZADD", KEYS[5], timestamp, jobId)
  rcall("PUBLISH", KEYS[5], delayedTimestamp)
else
  local target
  -- Whe check for the meta-paused key to decide if we are paused or not
  -- (since an empty list and !EXISTS are not really the same)
  local target, paused = getTargetQueueList(KEYS[3], KEYS[1], KEYS[2])
  -- Standard or priority add
  local priority = tonumber(ARGV[9])
  if priority == 0 then
      -- LIFO or FIFO
    rcall(ARGV[10], target, jobId)
  else
    addJobWithPriority(KEYS[6], priority, jobId, target)
  end
  -- Emit waiting event (wait..ing@token)
  rcall("PUBLISH", KEYS[1] .. "ing@" .. ARGV[11], jobId)
end
return jobId .. "" -- convert to string
`;
module.exports = {
  name: 'addJob',
  content,
  keys: 6,
};
