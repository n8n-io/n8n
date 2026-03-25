import type {ParseError} from './errors.ts'

/**
 * EventSource parser instance.
 *
 * Needs to be reset between reconnections/when switching data source, using the `reset()` method.
 *
 * @public
 */
export interface EventSourceParser {
  /**
   * Feeds the parser another chunk. The method _does not_ return a parsed message.
   * Instead, if the chunk was a complete message (or completed a previously incomplete message),
   * it will invoke the `onParse` callback used to create the parsers.
   *
   * @param chunk - The chunk to parse. Can be a partial, eg in the case of streaming messages.
   * @public
   */
  feed(chunk: string): void

  /**
   * Resets the parser state. This is required when you have a new stream of messages -
   * for instance in the case of a client being disconnected and reconnecting.
   *
   * Previously received, incomplete data will NOT be parsed unless you pass `consume: true`,
   * which tells the parser to attempt to consume any incomplete data as if it ended with a newline
   * character. This is useful for cases when a server sends a non-EventSource message that you
   * want to be able to react to in an `onError` callback.
   *
   * @public
   */
  reset(options?: {consume?: boolean}): void
}

/**
 * A parsed EventSource message event
 *
 * @public
 */
export interface EventSourceMessage {
  /**
   * The event type sent from the server. Note that this differs from the browser `EventSource`
   * implementation in that browsers will default this to `message`, whereas this parser will
   * leave this as `undefined` if not explicitly declared.
   */
  event?: string

  /**
   * ID of the message, if any was provided by the server. Can be used by clients to keep the
   * last received message ID in sync when reconnecting.
   */
  id?: string

  /**
   * The data received for this message
   */
  data: string
}

/**
 * Callbacks that can be passed to the parser to handle different types of parsed messages
 * and errors.
 *
 * @public
 */
export interface ParserCallbacks {
  /**
   * Callback for when a new event/message is parsed from the stream.
   * This is the main callback that clients will use to handle incoming messages.
   *
   * @param event - The parsed event/message
   */
  onEvent?: (event: EventSourceMessage) => void

  /**
   * Callback for when the server sends a new reconnection interval through the `retry` field.
   *
   * @param retry - The number of milliseconds to wait before reconnecting.
   */
  onRetry?: (retry: number) => void

  /**
   * Callback for when a comment is encountered in the stream.
   *
   * @param comment - The comment encountered in the stream.
   */
  onComment?: (comment: string) => void

  /**
   * Callback for when an error occurs during parsing. This is a catch-all for any errors
   * that occur during parsing, and can be used to handle them in a custom way. Most clients
   * tend to silently ignore any errors and instead retry, but it can be helpful to log/debug.
   *
   * @param error - The error that occurred during parsing
   */
  onError?: (error: ParseError) => void
}
