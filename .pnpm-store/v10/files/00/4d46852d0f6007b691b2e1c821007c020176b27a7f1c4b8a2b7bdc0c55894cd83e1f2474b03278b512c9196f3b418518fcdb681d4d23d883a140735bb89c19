--[[
    Completely obliterates a queue and all of its contents
     Input:

        KEYS[1] meta-paused
        KEYS[2] base
        
        ARGV[1]  count
        ARGV[2]  force
]] 
-- This command completely destroys a queue including all of its jobs, current or past 
-- leaving no trace of its existence. Since this script needs to iterate to find all the job
-- keys, consider that this call may be slow for very large queues.
-- The queue needs to be "paused" or it will return an error
-- If the queue has currently active jobs then the script by default will return error,
-- however this behaviour can be overrided using the 'force' option.
local maxCount = tonumber(ARGV[1])
local baseKey = KEYS[2]

local rcall = redis.call

-- Includes
--- @include "includes/removeDebounceKey"

local function getListItems(keyName, max)
    return rcall('LRANGE', keyName, 0, max - 1)
end

local function getZSetItems(keyName, max)
    return rcall('ZRANGE', keyName, 0, max - 1)
end

local function removeJobs(baseKey, keys)
    for i, key in ipairs(keys) do
        local jobKey = baseKey .. key
        rcall("DEL", jobKey, jobKey .. ':logs')
        removeDebounceKey(baseKey, jobKey)
    end
    maxCount = maxCount - #keys
end

local function removeListJobs(keyName, max)
    local jobs = getListItems(keyName, max)
    removeJobs(baseKey, jobs)
    rcall("LTRIM", keyName, #jobs, -1)
end

local function removeZSetJobs(keyName, max)
    local jobs = getZSetItems(keyName, max)
    removeJobs(baseKey, jobs)
    if (#jobs > 0) then rcall("ZREM", keyName, unpack(jobs)) end
end

local function removeLockKeys(keys)
    for i, key in ipairs(keys) do rcall("DEL", baseKey .. key .. ':lock') end
end

-- 1) Check if paused, if not return with error.
if rcall("EXISTS", KEYS[1]) ~= 1 then
    return -1 -- Error, NotPaused
end

-- 2) Check if there are active jobs, if there are and not "force" return error.
local activeKey = baseKey .. 'active'
local activeJobs = getListItems(activeKey, maxCount)
if (#activeJobs > 0) then
    if (ARGV[2] == "") then
        return -2 -- Error, ExistsActiveJobs
    end
end

removeLockKeys(activeJobs)
removeJobs(baseKey, activeJobs)
rcall("LTRIM", activeKey, #activeJobs, -1)
if (maxCount <= 0) then return 1 end

local waitKey = baseKey .. 'paused'
removeListJobs(waitKey, maxCount)
if (maxCount <= 0) then return 1 end

local delayedKey = baseKey .. 'delayed'
removeZSetJobs(delayedKey, maxCount)
if (maxCount <= 0) then return 1 end

local completedKey = baseKey .. 'completed'
removeZSetJobs(completedKey, maxCount)
if (maxCount <= 0) then return 1 end

local failedKey = baseKey .. 'failed'
removeZSetJobs(failedKey, maxCount)
if (maxCount <= 0) then return 1 end

if (maxCount > 0) then
    rcall("DEL", baseKey .. 'priority')
    rcall("DEL", baseKey .. 'stalled-check')
    rcall("DEL", baseKey .. 'stalled')
    rcall("DEL", baseKey .. 'meta-paused')
    rcall("DEL", baseKey .. 'meta')
    rcall("DEL", baseKey .. 'id')
    rcall("DEL", baseKey .. 'repeat')
    rcall("DEL", baseKey .. 'metrics:completed')
    rcall("DEL", baseKey .. 'metrics:completed:data')
    rcall("DEL", baseKey .. 'metrics:failed')
    rcall("DEL", baseKey .. 'metrics:failed:data')
    return 0
else
    return 1
end
