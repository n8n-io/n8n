/**
 * The type of error that occurred.
 * @public
 */
export declare type ErrorType = 'invalid-retry' | 'unknown-field'

/**
 * A parsed EventSource message event
 *
 * @public
 */
export declare interface EventSourceMessage {
  /**
   * The event type sent from the server. Note that this differs from the browser `EventSource`
   * implementation in that browsers will default this to `message`, whereas this parser will
   * leave this as `undefined` if not explicitly declared.
   */
  event?: string | undefined
  /**
   * ID of the message, if any was provided by the server. Can be used by clients to keep the
   * last received message ID in sync when reconnecting.
   */
  id?: string | undefined
  /**
   * The data received for this message
   */
  data: string
}

/**
 * A TransformStream that ingests a stream of strings and produces a stream of `EventSourceMessage`.
 *
 * @example Basic usage
 * ```
 * const eventStream =
 *   response.body
 *     .pipeThrough(new TextDecoderStream())
 *     .pipeThrough(new EventSourceParserStream())
 * ```
 *
 * @example Terminate stream on parsing errors
 * ```
 * const eventStream =
 *  response.body
 *   .pipeThrough(new TextDecoderStream())
 *   .pipeThrough(new EventSourceParserStream({terminateOnError: true}))
 * ```
 *
 * @public
 */
export declare class EventSourceParserStream extends TransformStream<string, EventSourceMessage> {
  constructor({onError, onRetry, onComment}?: StreamOptions)
}

/**
 * Error thrown when encountering an issue during parsing.
 *
 * @public
 */
export declare class ParseError extends Error {
  /**
   * The type of error that occurred.
   */
  type: ErrorType
  /**
   * In the case of an unknown field encountered in the stream, this will be the field name.
   */
  field?: string | undefined
  /**
   * In the case of an unknown field encountered in the stream, this will be the value of the field.
   */
  value?: string | undefined
  /**
   * The line that caused the error, if available.
   */
  line?: string | undefined
  constructor(
    message: string,
    options: {
      type: ErrorType
      field?: string
      value?: string
      line?: string
    },
  )
}

/**
 * Options for the EventSourceParserStream.
 *
 * @public
 */
export declare interface StreamOptions {
  /**
   * Behavior when a parsing error occurs.
   *
   * - A custom function can be provided to handle the error.
   * - `'terminate'` will error the stream and stop parsing.
   * - Any other value will ignore the error and continue parsing.
   *
   * @defaultValue `undefined`
   */
  onError?: ('terminate' | ((error: Error) => void)) | undefined
  /**
   * Callback for when a reconnection interval is sent from the server.
   *
   * @param retry - The number of milliseconds to wait before reconnecting.
   */
  onRetry?: ((retry: number) => void) | undefined
  /**
   * Callback for when a comment is encountered in the stream.
   *
   * @param comment - The comment encountered in the stream.
   */
  onComment?: ((comment: string) => void) | undefined
}

export {}
