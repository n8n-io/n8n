--[[
  Update job data

  Input:
    KEYS[1] Job id key

    ARGV[1] data

  Output:
    0 - OK
   -1 - Missing job.
]]
local rcall = redis.call

if rcall("EXISTS",KEYS[1]) == 1 then -- // Make sure job exists
  rcall("HSET", KEYS[1], "data", ARGV[1])
  return 0
else
  return -1
end
