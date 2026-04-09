/**
 * EventSource/Server-Sent Events parser
 * @see https://html.spec.whatwg.org/multipage/server-sent-events.html
 */
import {ParseError} from './errors.ts'
import type {EventSourceParser, ParserCallbacks} from './types.ts'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function noop(_arg: unknown) {
  // intentional noop
}

/**
 * Creates a new EventSource parser.
 *
 * @param callbacks - Callbacks to invoke on different parsing events:
 *   - `onEvent` when a new event is parsed
 *   - `onError` when an error occurs
 *   - `onRetry` when a new reconnection interval has been sent from the server
 *   - `onComment` when a comment is encountered in the stream
 *
 * @returns A new EventSource parser, with `parse` and `reset` methods.
 * @public
 */
export function createParser(callbacks: ParserCallbacks): EventSourceParser {
  if (typeof callbacks === 'function') {
    throw new TypeError(
      '`callbacks` must be an object, got a function instead. Did you mean `{onEvent: fn}`?',
    )
  }

  const {onEvent = noop, onError = noop, onRetry = noop, onComment} = callbacks

  let incompleteLine = ''

  let isFirstChunk = true
  let id: string | undefined
  let data = ''
  let eventType = ''

  function feed(newChunk: string) {
    // Strip any UTF8 byte order mark (BOM) at the start of the stream
    const chunk = isFirstChunk ? newChunk.replace(/^\xEF\xBB\xBF/, '') : newChunk

    // If there was a previous incomplete line, append it to the new chunk,
    // so we may process it together as a new (hopefully complete) chunk.
    const [complete, incomplete] = splitLines(`${incompleteLine}${chunk}`)

    for (const line of complete) {
      parseLine(line)
    }

    incompleteLine = incomplete
    isFirstChunk = false
  }

  function parseLine(line: string) {
    // If the line is empty (a blank line), dispatch the event
    if (line === '') {
      dispatchEvent()
      return
    }

    // If the line starts with a U+003A COLON character (:), ignore the line.
    if (line.startsWith(':')) {
      if (onComment) {
        onComment(line.slice(line.startsWith(': ') ? 2 : 1))
      }
      return
    }

    // If the line contains a U+003A COLON character (:)
    const fieldSeparatorIndex = line.indexOf(':')
    if (fieldSeparatorIndex !== -1) {
      // Collect the characters on the line before the first U+003A COLON character (:),
      // and let `field` be that string.
      const field = line.slice(0, fieldSeparatorIndex)

      // Collect the characters on the line after the first U+003A COLON character (:),
      // and let `value` be that string. If value starts with a U+0020 SPACE character,
      // remove it from value.
      const offset = line[fieldSeparatorIndex + 1] === ' ' ? 2 : 1
      const value = line.slice(fieldSeparatorIndex + offset)

      processField(field, value, line)
      return
    }

    // Otherwise, the string is not empty but does not contain a U+003A COLON character (:)
    // Process the field using the whole line as the field name, and an empty string as the field value.
    // 👆 This is according to spec. That means that a line that has the value `data` will result in
    // a newline being added to the current `data` buffer, for instance.
    processField(line, '', line)
  }

  function processField(field: string, value: string, line: string) {
    // Field names must be compared literally, with no case folding performed.
    switch (field) {
      case 'event':
        // Set the `event type` buffer to field value
        eventType = value
        break
      case 'data':
        // Append the field value to the `data` buffer, then append a single U+000A LINE FEED(LF)
        // character to the `data` buffer.
        data = `${data}${value}\n`
        break
      case 'id':
        // If the field value does not contain U+0000 NULL, then set the `ID` buffer to
        // the field value. Otherwise, ignore the field.
        id = value.includes('\0') ? undefined : value
        break
      case 'retry':
        // If the field value consists of only ASCII digits, then interpret the field value as an
        // integer in base ten, and set the event stream's reconnection time to that integer.
        // Otherwise, ignore the field.
        if (/^\d+$/.test(value)) {
          onRetry(parseInt(value, 10))
        } else {
          onError(
            new ParseError(`Invalid \`retry\` value: "${value}"`, {
              type: 'invalid-retry',
              value,
              line,
            }),
          )
        }
        break
      default:
        // Otherwise, the field is ignored.
        onError(
          new ParseError(
            `Unknown field "${field.length > 20 ? `${field.slice(0, 20)}…` : field}"`,
            {type: 'unknown-field', field, value, line},
          ),
        )
        break
    }
  }

  function dispatchEvent() {
    const shouldDispatch = data.length > 0
    if (shouldDispatch) {
      onEvent({
        id,
        event: eventType || undefined,
        // If the data buffer's last character is a U+000A LINE FEED (LF) character,
        // then remove the last character from the data buffer.
        data: data.endsWith('\n') ? data.slice(0, -1) : data,
      })
    }

    // Reset for the next event
    id = undefined
    data = ''
    eventType = ''
  }

  function reset(options: {consume?: boolean} = {}) {
    if (incompleteLine && options.consume) {
      parseLine(incompleteLine)
    }

    isFirstChunk = true
    id = undefined
    data = ''
    eventType = ''
    incompleteLine = ''
  }

  return {feed, reset}
}

/**
 * For the given `chunk`, split it into lines according to spec, and return any remaining incomplete line.
 *
 * @param chunk - The chunk to split into lines
 * @returns A tuple containing an array of complete lines, and any remaining incomplete line
 * @internal
 */
function splitLines(chunk: string): [complete: Array<string>, incomplete: string] {
  /**
   * According to the spec, a line is terminated by either:
   * - U+000D CARRIAGE RETURN U+000A LINE FEED (CRLF) character pair
   * - a single U+000A LINE FEED(LF) character not preceded by a U+000D CARRIAGE RETURN(CR) character
   * - a single U+000D CARRIAGE RETURN(CR) character not followed by a U+000A LINE FEED(LF) character
   */
  const lines: Array<string> = []
  let incompleteLine = ''
  let searchIndex = 0

  while (searchIndex < chunk.length) {
    // Find next line terminator
    const crIndex = chunk.indexOf('\r', searchIndex)
    const lfIndex = chunk.indexOf('\n', searchIndex)

    // Determine line end
    let lineEnd = -1
    if (crIndex !== -1 && lfIndex !== -1) {
      // CRLF case
      lineEnd = Math.min(crIndex, lfIndex)
    } else if (crIndex !== -1) {
      // CR at the end of a chunk might be part of a CRLF sequence that spans chunks,
      // so we shouldn't treat it as a line terminator (yet)
      if (crIndex === chunk.length - 1) {
        lineEnd = -1
      } else {
        lineEnd = crIndex
      }
    } else if (lfIndex !== -1) {
      lineEnd = lfIndex
    }

    // Extract line if terminator found
    if (lineEnd === -1) {
      // No terminator found, rest is incomplete
      incompleteLine = chunk.slice(searchIndex)
      break
    } else {
      const line = chunk.slice(searchIndex, lineEnd)
      lines.push(line)

      // Move past line terminator
      searchIndex = lineEnd + 1
      if (chunk[searchIndex - 1] === '\r' && chunk[searchIndex] === '\n') {
        searchIndex++
      }
    }
  }

  return [lines, incompleteLine]
}
