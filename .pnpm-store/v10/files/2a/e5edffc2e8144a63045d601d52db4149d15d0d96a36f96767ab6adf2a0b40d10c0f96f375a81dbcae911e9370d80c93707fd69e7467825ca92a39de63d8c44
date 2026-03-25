--[[
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
--- @include "includes/addJobWithPriority"
--- @include "includes/getTargetQueueList"
--- @include "includes/removeLock"

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
