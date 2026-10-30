'use strict';
const content = `--[[
  Takes a lock
     Input:
        KEYS[1] 'lock',
        ARGV[1]  token
        ARGV[2]  lock duration in milliseconds
      Output:
        "OK" if lock taken successfully.
]]
if redis.call("SET", KEYS[1], ARGV[1], "NX", "PX", ARGV[2]) then
  return 1
else
  return 0
end
`;
module.exports = {
  name: 'takeLock',
  content,
  keys: 1,
};
