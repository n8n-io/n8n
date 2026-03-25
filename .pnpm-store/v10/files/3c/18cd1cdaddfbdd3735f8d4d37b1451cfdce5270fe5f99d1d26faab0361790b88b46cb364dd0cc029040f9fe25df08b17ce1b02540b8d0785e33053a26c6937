--[[
    Remove all jobs matching a given pattern from all the queues they may be in as well as all its data.
    In order to be able to remove any job, they must be unlocked.

     Input:
      KEYS[1] 'active',
      KEYS[2] 'wait',
      KEYS[3] 'delayed',
      KEYS[4] 'paused',
      KEYS[5] 'completed',
      KEYS[6] 'failed',
      KEYS[7] 'priority',
      KEYS[8] 'rate-limiter'

      ARGV[1]  prefix
      ARGV[2]  pattern
      ARGV[3]  cursor

     Events:
      'removed'
]]

-- TODO PUBLISH global events 'removed'

local rcall = redis.call
local result = rcall("SCAN", ARGV[3], "MATCH", ARGV[1] .. ARGV[2])
local cursor = result[1];
local jobKeys = result[2];
local removed = {}

local prefixLen = string.len(ARGV[1]) + 1
for i, jobKey in ipairs(jobKeys) do
    local keyTypeResp = rcall("TYPE", jobKey)
    if keyTypeResp["ok"] == "hash" then
        local jobId = string.sub(jobKey, prefixLen)
        local lockKey = jobKey .. ':lock'
        local lock = redis.call("GET", lockKey)
        if not lock then
            rcall("LREM", KEYS[1], 0, jobId)
            rcall("LREM", KEYS[2], 0, jobId)
            rcall("ZREM", KEYS[3], jobId)
            rcall("LREM", KEYS[4], 0, jobId)
            rcall("ZREM", KEYS[5], jobId)
            rcall("ZREM", KEYS[6], jobId)
            rcall("ZREM", KEYS[7], jobId)
            rcall("DEL", jobKey)
            rcall("DEL", jobKey .. ':logs')

            -- delete keys related to rate limiter
            local limiterIndexTable = KEYS[8] .. ":index"
            local limitedSetKey = rcall("HGET", limiterIndexTable, jobId)

            if limitedSetKey then
                rcall("SREM", limitedSetKey, jobId)
                rcall("HDEL", limiterIndexTable, jobId)
            end
            table.insert(removed, jobId)
        end
    end
end
return {cursor, removed}
