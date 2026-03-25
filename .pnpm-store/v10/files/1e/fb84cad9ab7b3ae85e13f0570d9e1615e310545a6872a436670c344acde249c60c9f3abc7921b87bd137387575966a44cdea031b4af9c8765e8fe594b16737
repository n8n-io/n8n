--[[
  Save stacktrace and failedReason.

  Input:
    KEYS[1] job key

    ARGV[1]  stacktrace
    ARGV[2]  failedReason
    ARGV[3]  attemptsMade

  Output:
     0 - OK
    -1 - Missing key
]]
local rcall = redis.call

if rcall("EXISTS", KEYS[1]) == 1 then
  rcall("HMSET", KEYS[1], "stacktrace", ARGV[1], "failedReason", ARGV[2],
    "attemptsMade", ARGV[3])

  return 0
else
  return -1
end
