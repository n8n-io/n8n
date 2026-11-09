'use strict';
const content = `--[[
  Release lock
     Input:
        KEYS[1] 'lock',
        ARGV[1]  token
        ARGV[2]  lock duration in milliseconds
      Output:
        "OK" if lock extented succesfully.
]]
local rcall = redis.call
if rcall("GET", KEYS[1]) == ARGV[1] then
  return rcall("DEL", KEYS[1])
else
  return 0
end
`;
module.exports = {
  name: 'releaseLock',
  content,
  keys: 1,
};
