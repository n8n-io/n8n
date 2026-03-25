--[[
  Moves job from active to delayed set.

  Input:
    KEYS[1] active key
    KEYS[2] delayed key
    KEYS[3] job key
    KEYS[4] stalled key

    ARGV[1] delayedTimestamp
    ARGV[2] the id of the job
    ARGV[3] queue token

  Output:
    0 - OK
   -1 - Missing job.
   -2 - Job is locked.

  Events:
    - delayed key.
]]
local rcall = redis.call

-- Includes
--- @include "includes/removeLock"

if rcall("EXISTS", KEYS[3]) == 1 then
  local errorCode = removeLock(KEYS[3], KEYS[4], ARGV[3], ARGV[2])
  if errorCode < 0 then
    return errorCode
  end

  local numRemovedElements = rcall("LREM", KEYS[1], -1, ARGV[2])
  if numRemovedElements < 1 then return -3 end

  local score = tonumber(ARGV[1])
  rcall("ZADD", KEYS[2], score, ARGV[2])
  rcall("PUBLISH", KEYS[2], (score / 0x1000))

  return 0
else
  return -1
end
