--[[
  Pauses or resumes a queue globably.

   Input:
      KEYS[1] 'wait' or 'paused''
      KEYS[2] 'paused' or 'wait'
      KEYS[3] 'meta-paused'
      KEYS[4] 'paused' o 'resumed' event.
      KEYS[5] 'meta' this key is only used in BullMQ and above.

      ARGV[1] 'paused' or 'resumed'

    Event:
      publish paused or resumed event.
]]
local rcall = redis.call

if rcall("EXISTS", KEYS[1]) == 1 then
  rcall("RENAME", KEYS[1], KEYS[2])
end

if ARGV[1] == "paused" then
  rcall("SET", KEYS[3], 1)

  -- for forwards compatibility
  rcall("HSET", KEYS[5], "paused", 1)
else
  rcall("DEL", KEYS[3])

  -- for forwards compatibility
  rcall("HDEL", KEYS[5], "paused")

end

rcall("PUBLISH", KEYS[4], ARGV[1])
