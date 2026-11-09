'use strict';
const content = `--[[
  Get counts per provided states
    Input:
      KEYS[1] wait key
      KEYS[2] paused key
      KEYS[3] meta-paused key
      KEYS[4] priority key
      ARGV[1...] priorities
]]
local rcall = redis.call
local results = {}
local prioritizedKey = KEYS[4]
-- Includes
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
for i = 1, #ARGV do
  local priority = tonumber(ARGV[i])
  if priority == 0 then
    local target = getTargetQueueList(KEYS[3], KEYS[1], KEYS[2])
    local count = rcall("LLEN", target) - rcall("ZCARD", prioritizedKey)
    if count < 0 then
      -- considering when last waiting job is moved to active before
      -- removing priority reference
      results[#results+1] = 0
    else
      results[#results+1] = count
    end
  else
    results[#results+1] = rcall("ZCOUNT", prioritizedKey,
      priority, priority)
  end
end
return results
`;
module.exports = {
  name: 'getCountsPerPriority',
  content,
  keys: 4,
};
