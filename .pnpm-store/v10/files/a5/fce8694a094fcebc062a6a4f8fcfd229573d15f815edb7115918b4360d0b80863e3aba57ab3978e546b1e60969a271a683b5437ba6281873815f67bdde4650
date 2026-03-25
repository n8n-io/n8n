--[[
      Checks if job is in a given list.

      Input:
        KEYS[1]
        ARGV[1]

      Output:
        1 if element found in the list.
]]
local function item_in_list (list, item)
  for _, v in pairs(list) do
    if v == item then
      return 1
    end
  end
  return nil
end
local items = redis.call("LRANGE", KEYS[1] , 0, -1)
return item_in_list(items, ARGV[1])
