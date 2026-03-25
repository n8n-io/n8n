--[[
  Remove jobs from the specific set.

  Input:
    KEYS[1]  set key,
    KEYS[2]  priority key
    KEYS[3]  rate limiter key

    ARGV[1]  prefix key
    ARGV[2]  maxTimestamp
    ARGV[3]  limit the number of jobs to be removed. 0 is unlimited
    ARGV[4]  set name, can be any of 'wait', 'active', 'paused', 'delayed', 'completed', or 'failed'
]]

local setKey = KEYS[1]
local priorityKey = KEYS[2]
local rateLimiterKey = KEYS[3]

local prefixKey = ARGV[1]
local maxTimestamp = ARGV[2]
local limitStr = ARGV[3]
local setName = ARGV[4]

local isList = false
local rcall = redis.call

-- Includes
--- @include "includes/removeDebounceKey"

if setName == "wait" or setName == "active" or setName == "paused" then
  isList = true
end

-- We use ZRANGEBYSCORE to make the case where we're deleting a limited number
-- of items in a sorted set only run a single iteration. If we simply used
-- ZRANGE, we may take a long time traversing through jobs that are within the
-- grace period.
local function shouldUseZRangeByScore(isList, limit)
  return not isList and limit > 0
end

local function getJobs(setKey, isList, rangeStart, rangeEnd, maxTimestamp, limit)
  if isList then
    return rcall("LRANGE", setKey, rangeStart, rangeEnd)
  elseif shouldUseZRangeByScore(isList, limit) then
    return rcall("ZRANGEBYSCORE", setKey, 0, maxTimestamp, "LIMIT", 0, limit)
  else
    return rcall("ZRANGE", setKey, rangeStart, rangeEnd)
  end
end

local limit = tonumber(limitStr)
local rangeStart = 0
local rangeEnd = -1

-- If we're only deleting _n_ items, avoid retrieving all items
-- for faster performance
--
-- Start from the tail of the list, since that's where oldest elements
-- are generally added for FIFO lists
if limit > 0 then
  rangeStart = -1 - limit + 1
  rangeEnd = -1
end

local jobIds = getJobs(setKey, isList, rangeStart, rangeEnd, maxTimestamp, limit)
local deleted = {}
local deletedCount = 0
local jobTS

-- Run this loop:
-- - Once, if limit is -1 or 0
-- - As many times as needed if limit is positive
while ((limit <= 0 or deletedCount < limit) and next(jobIds, nil) ~= nil) do
  local jobIdsLen = #jobIds
  for i, jobId in ipairs(jobIds) do
    if limit > 0 and deletedCount >= limit then
      break
    end

    local jobKey = prefixKey .. jobId
    if (rcall("EXISTS", jobKey .. ":lock") == 0) then
      -- Find the right timestamp of the job to compare to maxTimestamp:
      -- * finishedOn says when the job was completed, but it isn't set unless the job has actually completed
      -- * processedOn represents when the job was last attempted, but it doesn't get populated until the job is first tried
      -- * timestamp is the original job submission time
      -- Fetch all three of these (in that order) and use the first one that is set so that we'll leave jobs that have been active within the grace period:
      for _, ts in ipairs(rcall("HMGET", jobKey, "finishedOn", "processedOn", "timestamp")) do
        if (ts) then
          jobTS = ts
          break
        end
      end
      if (not jobTS or jobTS < maxTimestamp) then
        if isList then
          -- Job ids can't be the empty string. Use the empty string as a
          -- deletion marker. The actual deletion will occur at the end of the
          -- script.
          rcall("LSET", setKey, rangeEnd - jobIdsLen + i, "")
        else
          rcall("ZREM", setKey, jobId)
        end
        rcall("ZREM", priorityKey, jobId)

        if setName ~= "completed" and setName ~= "failed" then
          removeDebounceKey(prefixKey, jobKey)
        end

        rcall("DEL", jobKey)
        rcall("DEL", jobKey .. ":logs")

        -- delete keys related to rate limiter
        -- NOTE: this code is unncessary for other sets than wait, paused and delayed.
        local limiterIndexTable = rateLimiterKey .. ":index"
        local limitedSetKey = rcall("HGET", limiterIndexTable, jobId)

        if limitedSetKey then
          rcall("SREM", limitedSetKey, jobId)
          rcall("HDEL", limiterIndexTable, jobId)
        end

        deletedCount = deletedCount + 1
        table.insert(deleted, jobId)
      end
    end
  end

  -- If we didn't have a limit or used the single-iteration ZRANGEBYSCORE
  -- function, return immediately. We should have deleted all the jobs we can
  if limit <= 0 or shouldUseZRangeByScore(isList, limit) then
    break
  end

  if deletedCount < limit then
    -- We didn't delete enough. Look for more to delete
    rangeStart = rangeStart - limit
    rangeEnd = rangeEnd - limit
    jobIds = getJobs(setKey, isList, rangeStart, rangeEnd, maxTimestamp, limit)
  end
end

if isList then
  rcall("LREM", setKey, 0, "")
end

return deleted
