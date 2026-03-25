--[[
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
--- @include "includes/getTargetQueueList"

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
