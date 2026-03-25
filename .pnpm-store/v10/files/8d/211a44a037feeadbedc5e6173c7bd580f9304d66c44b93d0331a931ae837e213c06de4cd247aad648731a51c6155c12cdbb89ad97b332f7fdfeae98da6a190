--[[
  Function to check for the meta.paused key to decide if we are paused or not
  (since an empty list and !EXISTS are not really the same).
]]

local function getTargetQueueList(queueMetaKey, waitKey, pausedKey)
  if rcall("EXISTS", queueMetaKey) ~= 1 then
    return waitKey, false
  else
    return pausedKey, true
  end
end
