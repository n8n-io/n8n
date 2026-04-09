/**
 * The type of error that occurred.
 * @public
 */
export type ErrorType = 'invalid-retry' | 'unknown-field'

/**
 * Error thrown when encountering an issue during parsing.
 *
 * @public
 */
export class ParseError extends Error {
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
    options: {type: ErrorType; field?: string; value?: string; line?: string},
  ) {
    super(message)
    this.name = 'ParseError'
    this.type = options.type
    this.field = options.field
    this.value = options.value
    this.line = options.line
  }
}
