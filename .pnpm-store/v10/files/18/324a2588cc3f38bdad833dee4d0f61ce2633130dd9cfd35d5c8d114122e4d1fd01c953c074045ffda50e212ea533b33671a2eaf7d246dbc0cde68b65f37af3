
--[[
  Function to remove debounce key.
]]

local function removeDebounceKey(prefixKey, jobKey)
  local debounceId = rcall("HGET", jobKey, "deid")
  if debounceId then
    local debounceKey = prefixKey .. "de:" .. debounceId
    rcall("DEL", debounceKey)
  end
end
