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
