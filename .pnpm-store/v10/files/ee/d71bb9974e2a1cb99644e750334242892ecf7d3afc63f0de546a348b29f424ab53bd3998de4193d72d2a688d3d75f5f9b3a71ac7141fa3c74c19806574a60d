import {createParser} from './parse.ts'
import type {EventSourceMessage, EventSourceParser} from './types.ts'

/**
 * Options for the EventSourceParserStream.
 *
 * @public
 */
export interface StreamOptions {
  /**
   * Behavior when a parsing error occurs.
   *
   * - A custom function can be provided to handle the error.
   * - `'terminate'` will error the stream and stop parsing.
   * - Any other value will ignore the error and continue parsing.
   *
   * @defaultValue `undefined`
   */
  onError?: 'terminate' | ((error: Error) => void)

  /**
   * Callback for when a reconnection interval is sent from the server.
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
export class EventSourceParserStream extends TransformStream<string, EventSourceMessage> {
  constructor({onError, onRetry, onComment}: StreamOptions = {}) {
    let parser!: EventSourceParser

    super({
      start(controller) {
        parser = createParser({
          onEvent: (event) => {
            controller.enqueue(event)
          },
          onError(error) {
            if (onError === 'terminate') {
              controller.error(error)
            } else if (typeof onError === 'function') {
              onError(error)
            }

            // Ignore by default
          },
          onRetry,
          onComment,
        })
      },
      transform(chunk) {
        parser.feed(chunk)
      },
    })
  }
}

export {type ErrorType, ParseError} from './errors.ts'
export type {EventSourceMessage} from './types.ts'
