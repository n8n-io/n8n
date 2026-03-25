'use strict'
const { Transform } = require('node:stream')
const { isASCIINumber, isValidLastEventId } = require('./util')

/**
 * @type {number[]} BOM
 */
const BOM = [0xEF, 0xBB, 0xBF]
/**
 * @type {10} LF
 */
const LF = 0x0A
/**
 * @type {13} CR
 */
const CR = 0x0D
/**
 * @type {58} COLON
 */
const COLON = 0x3A
/**
 * @type {32} SPACE
 */
const SPACE = 0x20

/**
 * @typedef {object} EventSourceStreamEvent
 * @type {object}
 * @property {string} [event] The event type.
 * @property {string} [data] The data of the message.
 * @property {string} [id] A unique ID for the event.
 * @property {string} [retry] The reconnection time, in milliseconds.
 */

/**
 * @typedef eventSourceSettings
 * @type {object}
 * @property {string} [lastEventId] The last event ID received from the server.
 * @property {string} [origin] The origin of the event source.
 * @property {number} [reconnectionTime] The reconnection time, in milliseconds.
 */

class EventSourceStream extends Transform {
  /**
   * @type {eventSourceSettings}
   */
  state

  /**
   * Leading byte-order-mark check.
   * @type {boolean}
   */
  checkBOM = true

  /**
   * @type {boolean}
   */
  crlfCheck = false

  /**
   * @type {boolean}
   */
  eventEndCheck = false

  /**
   * @type {Buffer|null}
   */
  buffer = null

  pos = 0

  event = {
    data: undefined,
    event: undefined,
    id: undefined,
    retry: undefined
  }

  /**
   * @param {object} options
   * @param {boolean} [options.readableObjectMode]
   * @param {eventSourceSettings} [options.eventSourceSettings]
   * @param {(chunk: any, encoding?: BufferEncoding | undefined) => boolean} [options.push]
   */
  constructor (options = {}) {
    // Enable object mode as EventSourceStream emits objects of shape
    // EventSourceStreamEvent
    options.readableObjectMode = true

    super(options)

    this.state = options.eventSourceSettings || {}
    if (options.push) {
      this.push = options.push
    }
  }

  /**
   * @param {Buffer} chunk
   * @param {string} _encoding
   * @param {Function} callback
   * @returns {void}
   */
  _transform (chunk, _encoding, callback) {
    if (chunk.length === 0) {
      callback()
      return
    }

    // Cache the chunk in the buffer, as the data might not be complete while
    // processing it
    // TODO: Investigate if there is a more performant way to handle
    // incoming chunks
    // see: https://github.com/nodejs/undici/issues/2630
    if (this.buffer) {
      this.buffer = Buffer.concat([this.buffer, chunk])
    } else {
      this.buffer = chunk
    }

    // Strip leading byte-order-mark if we opened the stream and started
    // the processing of the incoming data
    if (this.checkBOM) {
      switch (this.buffer.length) {
        case 1:
          // Check if the first byte is the same as the first byte of the BOM
          if (this.buffer[0] === BOM[0]) {
            // If it is, we need to wait for more data
            callback()
            return
          }
          // Set the checkBOM flag to false as we don't need to check for the
          // BOM anymore
          this.checkBOM = false

          // The buffer only contains one byte so we need to wait for more data
          callback()
          return
        case 2:
          // Check if the first two bytes are the same as the first two bytes
          // of the BOM
          if (
            this.buffer[0] === BOM[0] &&
            this.buffer[1] === BOM[1]
          ) {
            // If it is, we need to wait for more data, because the third byte
            // is needed to determine if it is the BOM or not
            callback()
            return
          }

          // Set the checkBOM flag to false as we don't need to check for the
          // BOM anymore
          this.checkBOM = false
          break
        case 3:
          // Check if the first three bytes are the same as the first three
          // bytes of the BOM
          if (
            this.buffer[0] === BOM[0] &&
            this.buffer[1] === BOM[1] &&
            this.buffer[2] === BOM[2]
          ) {
            // If it is, we can drop the buffered data, as it is only the BOM
            this.buffer = Buffer.alloc(0)
            // Set the checkBOM flag to false as we don't need to check for the
            // BOM anymore
            this.checkBOM = false

            // Await more data
            callback()
            return
          }
          // If it is not the BOM, we can start processing the data
          this.checkBOM = false
          break
        default:
          // The buffer is longer than 3 bytes, so we can drop the BOM if it is
          // present
          if (
            this.buffer[0] === BOM[0] &&
            this.buffer[1] === BOM[1] &&
            this.buffer[2] === BOM[2]
          ) {
            // Remove the BOM from the buffer
            this.buffer = this.buffer.subarray(3)
          }

          // Set the checkBOM flag to false as we don't need to check for the
          this.checkBOM = false
          break
      }
    }

    while (this.pos < this.buffer.length) {
      // If the previous line ended with an end-of-line, we need to check
      // if the next character is also an end-of-line.
      if (this.eventEndCheck) {
        // If the the current character is an end-of-line, then the event
        // is finished and we can process it

        // If the previous line ended with a carriage return, we need to
        // check if the current character is a line feed and remove it
        // from the buffer.
        if (this.crlfCheck) {
          // If the current character is a line feed, we can remove it
          // from the buffer and reset the crlfCheck flag
          if (this.buffer[this.pos] === LF) {
            this.buffer = this.buffer.subarray(this.pos + 1)
            this.pos = 0
            this.crlfCheck = false

            // It is possible that the line feed is not the end of the
            // event. We need to check if the next character is an
            // end-of-line character to determine if the event is
            // finished. We simply continue the loop to check the next
            // character.

            // As we removed the line feed from the buffer and set the
            // crlfCheck flag to false, we basically don't make any
            // distinction between a line feed and a carriage return.
            continue
          }
          this.crlfCheck = false
        }

        if (this.buffer[this.pos] === LF || this.buffer[this.pos] === CR) {
          // If the current character is a carriage return, we need to
          // set the crlfCheck flag to true, as we need to check if the
          // next character is a line feed so we can remove it from the
          // buffer
          if (this.buffer[this.pos] === CR) {
            this.crlfCheck = true
          }

          this.buffer = this.buffer.subarray(this.pos + 1)
          this.pos = 0
          if (
            this.event.data !== undefined || this.event.event || this.event.id !== undefined || this.event.retry) {
            this.processEvent(this.event)
          }
          this.clearEvent()
          continue
        }
        // If the current character is not an end-of-line, then the event
        // is not finished and we have to reset the eventEndCheck flag
        this.eventEndCheck = false
        continue
      }

      // If the current character is an end-of-line, we can process the
      // line
      if (this.buffer[this.pos] === LF || this.buffer[this.pos] === CR) {
        // If the current character is a carriage return, we need to
        // set the crlfCheck flag to true, as we need to check if the
        // next character is a line feed
        if (this.buffer[this.pos] === CR) {
          this.crlfCheck = true
        }

        // In any case, we can process the line as we reached an
        // end-of-line character
        this.parseLine(this.buffer.subarray(0, this.pos), this.event)

        // Remove the processed line from the buffer
        this.buffer = this.buffer.subarray(this.pos + 1)
        // Reset the position as we removed the processed line from the buffer
        this.pos = 0
        // A line was processed and this could be the end of the event. We need
        // to check if the next line is empty to determine if the event is
        // finished.
        this.eventEndCheck = true
        continue
      }

      this.pos++
    }

    callback()
  }

  /**
   * @param {Buffer} line
   * @param {EventSourceStreamEvent} event
   */
  parseLine (line, event) {
    // If the line is empty (a blank line)
    // Dispatch the event, as defined below.
    // This will be handled in the _transform method
    if (line.length === 0) {
      return
    }

    // If the line starts with a U+003A COLON character (:)
    // Ignore the line.
    const colonPosition = line.indexOf(COLON)
    if (colonPosition === 0) {
      return
    }

    let field = ''
    let value = ''

    // If the line contains a U+003A COLON character (:)
    if (colonPosition !== -1) {
      // Collect the characters on the line before the first U+003A COLON
      // character (:), and let field be that string.
      // TODO: Investigate if there is a more performant way to extract the
      // field
      // see: https://github.com/nodejs/undici/issues/2630
      field = line.subarray(0, colonPosition).toString('utf8')

      // Collect the characters on the line after the first U+003A COLON
      // character (:), and let value be that string.
      // If value starts with a U+0020 SPACE character, remove it from value.
      let valueStart = colonPosition + 1
      if (line[valueStart] === SPACE) {
        ++valueStart
      }
      // TODO: Investigate if there is a more performant way to extract the
      // value
      // see: https://github.com/nodejs/undici/issues/2630
      value = line.subarray(valueStart).toString('utf8')

      // Otherwise, the string is not empty but does not contain a U+003A COLON
      // character (:)
    } else {
      // Process the field using the steps described below, using the whole
      // line as the field name, and the empty string as the field value.
      field = line.toString('utf8')
      value = ''
    }

    // Modify the event with the field name and value. The value is also
    // decoded as UTF-8
    switch (field) {
      case 'data':
        if (event[field] === undefined) {
          event[field] = value
        } else {
          event[field] += `\n${value}`
        }
        break
      case 'retry':
        if (isASCIINumber(value)) {
          event[field] = value
        }
        break
      case 'id':
        if (isValidLastEventId(value)) {
          event[field] = value
        }
        break
      case 'event':
        if (value.length > 0) {
          event[field] = value
        }
        break
    }
  }

  /**
   * @param {EventSourceStreamEvent} event
   */
  processEvent (event) {
    if (event.retry && isASCIINumber(event.retry)) {
      this.state.reconnectionTime = parseInt(event.retry, 10)
    }

    if (event.id !== undefined && isValidLastEventId(event.id)) {
      this.state.lastEventId = event.id
    }

    // only dispatch event, when data is provided
    if (event.data !== undefined) {
      this.push({
        type: event.event || 'message',
        options: {
          data: event.data,
          lastEventId: this.state.lastEventId,
          origin: this.state.origin
        }
      })
    }
  }

  clearEvent () {
    this.event = {
      data: undefined,
      event: undefined,
      id: undefined,
      retry: undefined
    }
  }
}

module.exports = {
  EventSourceStream
}
