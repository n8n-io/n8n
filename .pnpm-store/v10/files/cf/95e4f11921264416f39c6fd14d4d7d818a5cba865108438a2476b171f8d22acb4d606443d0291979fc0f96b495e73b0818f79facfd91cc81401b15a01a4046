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