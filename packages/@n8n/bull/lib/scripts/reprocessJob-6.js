'use strict';
const content = `--[[
  Attempts to reprocess a job
  Input:
    KEYS[1] job key
    KEYS[2] job lock key
    KEYS[3] job state
    KEYS[4] wait key
    KEYS[5] meta-pause
    KEYS[6] paused key
    ARGV[1] job.id,
    ARGV[2] (job.opts.lifo ? 'R' : 'L') + 'PUSH'
    ARGV[3] token
    ARGV[4] timestamp
  Output:
    1 means the operation was a success
    0 means the job does not exist
    -1 means the job is currently locked and can't be retried.
    -2 means the job was not found in the expected set.
]]
local rcall = redis.call;
if (rcall("EXISTS", KEYS[1]) == 1) then
    if (rcall("EXISTS", KEYS[2]) == 0) then
        rcall("HDEL", KEYS[1], "finishedOn", "processedOn", "failedReason")
        rcall("HSET", KEYS[1], "retriedOn", ARGV[4])
        if (rcall("ZREM", KEYS[3], ARGV[1]) == 1) then
            local target
            if rcall("EXISTS", KEYS[5]) ~= 1 then
                target = KEYS[4]
            else
                target = KEYS[6]
            end
            rcall(ARGV[2], target, ARGV[1])
            -- Emit waiting event (wait..ing@token)
            rcall("PUBLISH", KEYS[4] .. "ing@" .. ARGV[3], ARGV[1])
            return 1
        else
            return -2
        end
    else
        return -1
    end
else
    return 0
end
`;
module.exports = {
  name: 'reprocessJob',
  content,
  keys: 6,
};
