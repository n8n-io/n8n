module.exports = decoder => ({
  attributes: decoder.readInt8(),
  timestamp: decoder.readInt64().toString(),
  key: decoder.readBytes(),
  value: decoder.readBytes(),
})
