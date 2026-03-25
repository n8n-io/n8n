'use strict';
const content = `--[[
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
`;
module.exports = {
  name: 'moveToDelayed',
  content,
  keys: 4,
};
