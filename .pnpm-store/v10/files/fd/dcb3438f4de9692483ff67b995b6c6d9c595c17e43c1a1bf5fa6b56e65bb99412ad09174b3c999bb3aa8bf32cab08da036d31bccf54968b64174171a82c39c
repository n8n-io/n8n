// This file draws heavily from https://github.com/phoenixframework/phoenix/commit/cf098e9cf7a44ee6479d31d911a97d3c7430c6fe
// License: https://github.com/phoenixframework/phoenix/blob/master/LICENSE.md

export default class Serializer {
  HEADER_LENGTH = 1

  decode(rawPayload: ArrayBuffer | string, callback: Function) {
    if (rawPayload.constructor === ArrayBuffer) {
      return callback(this._binaryDecode(rawPayload))
    }

    if (typeof rawPayload === 'string') {
      return callback(JSON.parse(rawPayload))
    }

    return callback({})
  }

  private _binaryDecode(buffer: ArrayBuffer) {
    const view = new DataView(buffer)
    const decoder = new TextDecoder()

    return this._decodeBroadcast(buffer, view, decoder)
  }

  private _decodeBroadcast(
    buffer: ArrayBuffer,
    view: DataView,
    decoder: TextDecoder
  ): {
    ref: null
    topic: string
    event: string
    payload: { [key: string]: any }
  } {
    const topicSize = view.getUint8(1)
    const eventSize = view.getUint8(2)
    let offset = this.HEADER_LENGTH + 2
    const topic = decoder.decode(buffer.slice(offset, offset + topicSize))
    offset = offset + topicSize
    const event = decoder.decode(buffer.slice(offset, offset + eventSize))
    offset = offset + eventSize
    const data = JSON.parse(
      decoder.decode(buffer.slice(offset, buffer.byteLength))
    )

    return { ref: null, topic: topic, event: event, payload: data }
  }
}
