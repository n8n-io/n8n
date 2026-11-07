'use strict';
const content = `--[[
  Checks if a job is finished (.i.e. is in the completed or failed set)
  Input: 
    KEYS[1] completed key
    KEYS[2] failed key
    ARGV[1] job id
  Output:
    0 - not finished.
    1 - completed.
    2 - failed.
]]
if redis.call("ZSCORE", KEYS[1], ARGV[1]) ~= false then
  return 1
end
if redis.call("ZSCORE", KEYS[2], ARGV[1]) ~= false then
  return 2
end
return redis.call("ZSCORE", KEYS[2], ARGV[1])
`;
module.exports = {
  name: 'isFinished',
  content,
  keys: 2,
};
