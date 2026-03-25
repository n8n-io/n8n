'use strict'

const { Writable } = require('stream')
const diagnosticsChannel = require('diagnostics_channel')
const { parserStates, opcodes, states, emptyBuffer } = require('./constants')
const { kReadyState, kSentClose, kResponse, kReceivedClose } = require('./symbols')
const { isValidStatusCode, failWebsocketConnection, websocketMessageReceived } = require('./util')
const { WebsocketFrameSend } = require('./frame')

// This code was influenced by ws released under the MIT license.
// Copyright (c) 2011 Einar Otto Stangvik <einaros@gmail.com>
// Copyright (c) 2013 Arnout Kazemier and contributors
// Copyright (c) 2016 Luigi Pinca and contributors

const channels = {}
channels.ping = diagnosticsChannel.channel('undici:websocket:ping')
channels.pong = diagnosticsChannel.channel('undici:websocket:pong')

class ByteParser extends Writable {
  #buffers = []
  #byteOffset = 0

  #state = parserStates.INFO

  #info = {}
  #fragments = []

  constructor (ws) {
    super()

    this.ws = ws
  }

  /**
   * @param {Buffer} chunk
   * @param {() => void} callback
   */
  _write (chunk, _, callback) {
    this.#buffers.push(chunk)
    this.#byteOffset += chunk.length

    this.run(callback)
  }

  /**
   * Runs whenever a new chunk is received.
   * Callback is called whenever there are no more chunks buffering,
   * or not enough bytes are buffered to parse.
   */
  run (callback) {
    while (true) {
      if (this.#state === parserStates.INFO) {
        // If there aren't enough bytes to parse the payload length, etc.
        if (this.#byteOffset < 2) {
          return callback()
        }

        const buffer = this.consume(2)

        this.#info.fin = (buffer[0] & 0x80) !== 0
        this.#info.opcode = buffer[0] & 0x0F

        // If we receive a fragmented message, we use the type of the first
        // frame to parse the full message as binary/text, when it's terminated
        this.#info.originalOpcode ??= this.#info.opcode

        this.#info.fragmented = !this.#info.fin && this.#info.opcode !== opcodes.CONTINUATION

        if (this.#info.fragmented && this.#info.opcode !== opcodes.BINARY && this.#info.opcode !== opcodes.TEXT) {
          // Only text and binary frames can be fragmented
          failWebsocketConnection(this.ws, 'Invalid frame type was fragmented.')
          return
        }

        const payloadLength = buffer[1] & 0x7F

        if (payloadLength <= 125) {
          this.#info.payloadLength = payloadLength
          this.#state = parserStates.READ_DATA
        } else if (payloadLength === 126) {
          this.#state = parserStates.PAYLOADLENGTH_16
        } else if (payloadLength === 127) {
          this.#state = parserStates.PAYLOADLENGTH_64
        }

        if (this.#info.fragmented && payloadLength > 125) {
          // A fragmented frame can't be fragmented itself
          failWebsocketConnection(this.ws, 'Fragmented frame exceeded 125 bytes.')
          return
        } else if (
          (this.#info.opcode === opcodes.PING ||
            this.#info.opcode === opcodes.PONG ||
            this.#info.opcode === opcodes.CLOSE) &&
          payloadLength > 125
        ) {
          // Control frames can have a payload length of 125 bytes MAX
          failWebsocketConnection(this.ws, 'Payload length for control frame exceeded 125 bytes.')
          return
        } else if (this.#info.opcode === opcodes.CLOSE) {
          if (payloadLength === 1) {
            failWebsocketConnection(this.ws, 'Received close frame with a 1-byte body.')
            return
          }

          const body = this.consume(payloadLength)

          this.#info.closeInfo = this.parseCloseBody(false, body)

          if (!this.ws[kSentClose]) {
            // If an endpoint receives a Close frame and did not previously send a
            // Close frame, the endpoint MUST send a Close frame in response.  (When
            // sending a Close frame in response, the endpoint typically echos the
            // status code it received.)
            const body = Buffer.allocUnsafe(2)
            body.writeUInt16BE(this.#info.closeInfo.code, 0)
            const closeFrame = new WebsocketFrameSend(body)

            this.ws[kResponse].socket.write(
              closeFrame.createFrame(opcodes.CLOSE),
              (err) => {
                if (!err) {
                  this.ws[kSentClose] = true
                }
              }
            )
          }

          // Upon either sending or receiving a Close control frame, it is said
          // that _The WebSocket Closing Handshake is Started_ and that the
          // WebSocket connection is in the CLOSING state.
          this.ws[kReadyState] = states.CLOSING
          this.ws[kReceivedClose] = true

          this.end()

          return
        } else if (this.#info.opcode === opcodes.PING) {
          // Upon receipt of a Ping frame, an endpoint MUST send a Pong frame in
          // response, unless it already received a Close frame.
          // A Pong frame sent in response to a Ping frame must have identical
          // "Application data"

          const body = this.consume(payloadLength)

          if (!this.ws[kReceivedClose]) {
            const frame = new WebsocketFrameSend(body)

            this.ws[kResponse].socket.write(frame.createFrame(opcodes.PONG))

            if (channels.ping.hasSubscribers) {
              channels.ping.publish({
                payload: body
              })
            }
          }

          this.#state = parserStates.INFO

          if (this.#byteOffset > 0) {
            continue
          } else {
            callback()
            return
          }
        } else if (this.#info.opcode === opcodes.PONG) {
          // A Pong frame MAY be sent unsolicited.  This serves as a
          // unidirectional heartbeat.  A response to an unsolicited Pong frame is
          // not expected.

          const body = this.consume(payloadLength)

          if (channels.pong.hasSubscribers) {
            channels.pong.publish({
              payload: body
            })
          }

          if (this.#byteOffset > 0) {
            continue
          } else {
            callback()
            return
          }
        }
      } else if (this.#state === parserStates.PAYLOADLENGTH_16) {
        if (this.#byteOffset < 2) {
          return callback()
        }

        const buffer = this.consume(2)

        this.#info.payloadLength = buffer.readUInt16BE(0)
        this.#state = parserStates.READ_DATA
      } else if (this.#state === parserStates.PAYLOADLENGTH_64) {
        if (this.#byteOffset < 8) {
          return callback()
        }

        const buffer = this.consume(8)
        const upper = buffer.readUInt32BE(0)

        // 2^31 is the maxinimum bytes an arraybuffer can contain
        // on 32-bit systems. Although, on 64-bit systems, this is
        // 2^53-1 bytes.
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Invalid_array_length
        // https://source.chromium.org/chromium/chromium/src/+/main:v8/src/common/globals.h;drc=1946212ac0100668f14eb9e2843bdd846e510a1e;bpv=1;bpt=1;l=1275
        // https://source.chromium.org/chromium/chromium/src/+/main:v8/src/objects/js-array-buffer.h;l=34;drc=1946212ac0100668f14eb9e2843bdd846e510a1e
        if (upper > 2 ** 31 - 1) {
          failWebsocketConnection(this.ws, 'Received payload length > 2^31 bytes.')
          return
        }

        const lower = buffer.readUInt32BE(4)

        this.#info.payloadLength = (upper << 8) + lower
        this.#state = parserStates.READ_DATA
      } else if (this.#state === parserStates.READ_DATA) {
        if (this.#byteOffset < this.#info.payloadLength) {
          // If there is still more data in this chunk that needs to be read
          return callback()
        } else if (this.#byteOffset >= this.#info.payloadLength) {
          // If the server sent multiple frames in a single chunk

          const body = this.consume(this.#info.payloadLength)

          this.#fragments.push(body)

          // If the frame is unfragmented, or a fragmented frame was terminated,
          // a message was received
          if (!this.#info.fragmented || (this.#info.fin && this.#info.opcode === opcodes.CONTINUATION)) {
            const fullMessage = Buffer.concat(this.#fragments)

            websocketMessageReceived(this.ws, this.#info.originalOpcode, fullMessage)

            this.#info = {}
            this.#fragments.length = 0
          }

          this.#state = parserStates.INFO
        }
      }

      if (this.#byteOffset > 0) {
        continue
      } else {
        callback()
        break
      }
    }
  }

  /**
   * Take n bytes from the buffered Buffers
   * @param {number} n
   * @returns {Buffer|null}
   */
  consume (n) {
    if (n > this.#byteOffset) {
      return null
    } else if (n === 0) {
      return emptyBuffer
    }

    if (this.#buffers[0].length === n) {
      this.#byteOffset -= this.#buffers[0].length
      return this.#buffers.shift()
    }

    const buffer = Buffer.allocUnsafe(n)
    let offset = 0

    while (offset !== n) {
      const next = this.#buffers[0]
      const { length } = next

      if (length + offset === n) {
        buffer.set(this.#buffers.shift(), offset)
        break
      } else if (length + offset > n) {
        buffer.set(next.subarray(0, n - offset), offset)
        this.#buffers[0] = next.subarray(n - offset)
        break
      } else {
        buffer.set(this.#buffers.shift(), offset)
        offset += next.length
      }
    }

    this.#byteOffset -= n

    return buffer
  }

  parseCloseBody (onlyCode, data) {
    // https://datatracker.ietf.org/doc/html/rfc6455#section-7.1.5
    /** @type {number|undefined} */
    let code

    if (data.length >= 2) {
      // _The WebSocket Connection Close Code_ is
      // defined as the status code (Section 7.4) contained in the first Close
      // control frame received by the application
      code = data.readUInt16BE(0)
    }

    if (onlyCode) {
      if (!isValidStatusCode(code)) {
        return null
      }

      return { code }
    }

    // https://datatracker.ietf.org/doc/html/rfc6455#section-7.1.6
    /** @type {Buffer} */
    let reason = data.subarray(2)

    // Remove BOM
    if (reason[0] === 0xEF && reason[1] === 0xBB && reason[2] === 0xBF) {
      reason = reason.subarray(3)
    }

    if (code !== undefined && !isValidStatusCode(code)) {
      return null
    }

    try {
      // TODO: optimize this
      reason = new TextDecoder('utf-8', { fatal: true }).decode(reason)
    } catch {
      return null
    }

    return { code, reason }
  }

  get closingInfo () {
    return this.#info.closeInfo
  }
}

module.exports = {
  ByteParser
}
