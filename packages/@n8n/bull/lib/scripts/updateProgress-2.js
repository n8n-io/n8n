'use strict';
const content = `--[[
  Update job progress
     Input:
        KEYS[1] Job id key
        KEYS[2] progress event key
        ARGV[1] progress
        ARGV[2] event data
      Event:
        progress(jobId, progress)
]]
local rcall = redis.call
if rcall("EXISTS", KEYS[1]) == 1 then -- // Make sure job exists
  rcall("HSET", KEYS[1], "progress", ARGV[1])
  rcall("PUBLISH", KEYS[2], ARGV[2])
  return 0
else
  return -1
end
`;
module.exports = {
  name: 'updateProgress',
  content,
  keys: 2,
};
