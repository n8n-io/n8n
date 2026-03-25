/**
 * An extended version of the `Event` emitted by the `EventSource` object when an error occurs.
 * While the spec does not include any additional properties, we intentionally go beyond the spec
 * and provide some (minimal) additional information to aid in debugging.
 *
 * @public
 */
export class ErrorEvent extends Event {
  /**
   * HTTP status code, if this was triggered by an HTTP error
   * Note: this is not part of the spec, but is included for better error handling.
   *
   * @public
   */
  public code?: number | undefined

  /**
   * Optional message attached to the error.
   * Note: this is not part of the spec, but is included for better error handling.
   *
   * @public
   */
  public message?: string | undefined

  /**
   * Constructs a new `ErrorEvent` instance. This is typically not called directly,
   * but rather emitted by the `EventSource` object when an error occurs.
   *
   * @param type - The type of the event (should be "error")
   * @param errorEventInitDict - Optional properties to include in the error event
   */
  constructor(
    type: string,
    errorEventInitDict?: {message?: string | undefined; code?: number | undefined},
  ) {
    super(type)
    this.code = errorEventInitDict?.code ?? undefined
    this.message = errorEventInitDict?.message ?? undefined
  }

  /**
   * Node.js "hides" the `message` and `code` properties of the `ErrorEvent` instance,
   * when it is `console.log`'ed. This makes it harder to debug errors. To ease debugging,
   * we explicitly include the properties in the `inspect` method.
   *
   * This is automatically called by Node.js when you `console.log` an instance of this class.
   *
   * @param _depth - The current depth
   * @param options - The options passed to `util.inspect`
   * @param inspect - The inspect function to use (prevents having to import it from `util`)
   * @returns A string representation of the error
   */
  [Symbol.for('nodejs.util.inspect.custom')](
    _depth: number,
    options: {colors: boolean},
    inspect: (obj: unknown, inspectOptions: {colors: boolean}) => string,
  ): string {
    return inspect(inspectableError(this), options)
  }

  /**
   * Deno "hides" the `message` and `code` properties of the `ErrorEvent` instance,
   * when it is `console.log`'ed. This makes it harder to debug errors. To ease debugging,
   * we explicitly include the properties in the `inspect` method.
   *
   * This is automatically called by Deno when you `console.log` an instance of this class.
   *
   * @param inspect - The inspect function to use (prevents having to import it from `util`)
   * @param options - The options passed to `Deno.inspect`
   * @returns A string representation of the error
   */
  [Symbol.for('Deno.customInspect')](
    inspect: (obj: unknown, inspectOptions: {colors: boolean}) => string,
    options: {colors: boolean},
  ): string {
    return inspect(inspectableError(this), options)
  }
}

/**
 * For environments where DOMException may not exist, we will use a SyntaxError instead.
 * While this isn't strictly according to spec, it is very close.
 *
 * @param message - The message to include in the error
 * @returns A `DOMException` or `SyntaxError` instance
 * @internal
 */
export function syntaxError(message: string): SyntaxError {
  // If someone can figure out a way to make this work without depending on DOM/Node.js typings,
  // and without casting to `any`, please send a PR 🙏

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const DomException = (globalThis as any).DOMException
  if (typeof DomException === 'function') {
    return new DomException(message, 'SyntaxError')
  }

  return new SyntaxError(message)
}

/**
 * Flatten an error into a single error message string.
 * Unwraps nested errors and joins them with a comma.
 *
 * @param err - The error to flatten
 * @returns A string representation of the error
 * @internal
 */
export function flattenError(err: unknown): string {
  if (!(err instanceof Error)) {
    return `${err}`
  }

  if ('errors' in err && Array.isArray(err.errors)) {
    return err.errors.map(flattenError).join(', ')
  }

  if ('cause' in err && err.cause instanceof Error) {
    return `${err}: ${flattenError(err.cause)}`
  }

  return err.message
}

/**
 * Convert an `ErrorEvent` instance into a plain object for inspection.
 *
 * @param err - The `ErrorEvent` instance to inspect
 * @returns A plain object representation of the error
 * @internal
 */
function inspectableError(err: ErrorEvent) {
  return {
    type: err.type,
    message: err.message,
    code: err.code,
    defaultPrevented: err.defaultPrevented,
    cancelable: err.cancelable,
    timeStamp: err.timeStamp,
  }
}
