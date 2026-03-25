const Encoder = require('./encoder')

module.exports = async ({ correlationId, clientId, request: { apiKey, apiVersion, encode } }) => {
  const payload = await encode()
  const requestPayload = new Encoder()
    .writeInt16(apiKey)
    .writeInt16(apiVersion)
    .writeInt32(correlationId)
    .writeString(clientId)
    .writeEncoder(payload)

  return new Encoder().writeInt32(requestPayload.size()).writeEncoder(requestPayload)
}
