'use strict';
const content = `--[[
  Attempts to retry all failed jobs
  Input:
    KEYS[1] base key
    KEYS[2] failed state key
    KEYS[3] wait state key
    KEYS[4] 'meta-paused'
    KEYS[5] 'paused'
    ARGV[1]  count
  Output:
    1  means the operation is not completed
    0  means the operation is completed
]]
local baseKey = KEYS[1]
local maxCount = tonumber(ARGV[1])
local rcall = redis.call;
-- Includes
--[[
  Function to loop in batches.
  Just a bit of warning, some commands as ZREM
  could receive a maximum of 7000 parameters per call.
]]
local function batches(n, batchSize)
  local i = 0
  return function()
    local from = i * batchSize + 1
    i = i + 1
    if (from <= n) then
      local to = math.min(from + batchSize - 1, n)
      return from, to
    end
  end
end
local function getZSetItems(keyName, max)
    return rcall('ZRANGE', keyName, 0, max - 1)
end
local jobs = getZSetItems(KEYS[2], maxCount)
if (#jobs > 0) then
    for i, key in ipairs(jobs) do
        local jobKey = baseKey .. key
        rcall("HDEL", jobKey, "finishedOn", "processedOn", "failedReason")
    end
    local target
    if rcall("EXISTS", KEYS[4]) ~= 1 then
        target = KEYS[3]
    else
        target = KEYS[5]
    end
    for from, to in batches(#jobs, 7000) do
        rcall("ZREM", KEYS[2], unpack(jobs, from, to))
        rcall("LPUSH", target, unpack(jobs, from, to))
    end
end
maxCount = maxCount - #jobs
if (maxCount <= 0) then return 1 end
return 0
`;
module.exports = {
  name: 'retryJobs',
  content,
  keys: 5,
};
