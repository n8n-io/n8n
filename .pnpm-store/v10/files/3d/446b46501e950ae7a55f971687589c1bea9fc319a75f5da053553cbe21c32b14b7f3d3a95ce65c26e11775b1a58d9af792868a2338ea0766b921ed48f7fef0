import { lowerCaseObjectKeys } from './utils/index'
import { Request } from './request'
import type { Headers } from './types'

export const REGEXP_CONTENT_TYPE_JSON = /^application\/(json|.*\+json)/

export interface ResponseParams {
  readonly status?: number
  readonly rawData?: string
  readonly headers?: Headers
  readonly error?: Error
}

/**
 * @typedef Response
 * @param {Request} originalRequest, for auth it hides the password
 * @param {Integer} responseStatus
 * @param {String} responseData, defaults to null
 * @param {Object} responseHeaders, defaults to an empty object ({})
 * @param {Array<Error>} errors, defaults to an empty array ([])
 */
type SerializableJSON = number | string | boolean | null | Record<string, unknown>
export type ParsedJSON = SerializableJSON | SerializableJSON[]
export class Response<DataType extends ParsedJSON = ParsedJSON> {
  public readonly originalRequest: Request
  public readonly responseStatus: number
  public readonly responseData: string | null
  public readonly responseHeaders: Headers

  public readonly errors: Array<Error | string>
  public timeElapsed: number | null

  constructor(
    originalRequest: Request,
    responseStatus: number,
    responseData?: string | null,
    responseHeaders?: Headers,
    errors?: Array<Error | string>
  ) {
    const auth = originalRequest.requestParams && originalRequest.requestParams.auth
    if (auth) {
      const maskedAuth = { ...auth, password: '***' }
      this.originalRequest = originalRequest.enhance({ auth: maskedAuth })
    } else {
      this.originalRequest = originalRequest
    }

    this.responseStatus = responseStatus
    this.responseData = responseData ?? null
    this.responseHeaders = responseHeaders || {}
    this.errors = errors || []
    this.timeElapsed = null
  }

  public request() {
    return this.originalRequest
  }

  public status() {
    // IE sends 1223 instead of 204
    if (this.responseStatus === 1223) {
      return 204
    }

    return this.responseStatus
  }

  /**
   * Returns true if status is greater or equal 200 or lower than 400
   */
  public success() {
    const status = this.status()
    return status >= 200 && status < 400
  }

  /**
   * Returns an object with the headers. Header names are converted to
   * lowercase
   */
  public headers() {
    return lowerCaseObjectKeys(this.responseHeaders)
  }

  /**
   * Utility method to get a header value by name
   */
  public header<T extends string | number | boolean>(name: string): T | undefined {
    const key = name.toLowerCase()

    if (key in this.headers()) {
      return this.headers()[key] as T
    }

    return undefined
  }

  /**
   * Returns the original response data
   */
  public rawData() {
    return this.responseData
  }

  /**
   * Returns the response data, if "Content-Type" is "application/json"
   * it parses the response and returns an object.
   * Friendly reminder:
   *  - JSON.parse() can return null, an Array or an object.
   */
  public data<T = DataType>() {
    if (this.isContentTypeJSON() && this.responseData !== null) {
      try {
        return JSON.parse(this.responseData) as T
      } catch (_e) {} // eslint-disable-line no-empty
    }

    return this.responseData as unknown as T
  }

  public isContentTypeJSON() {
    const contentType = this.header<string>('content-type')

    if (contentType === undefined) {
      return false
    }

    return REGEXP_CONTENT_TYPE_JSON.test(contentType)
  }

  /**
   * Returns the last error instance that caused the request to fail
   */
  public error() {
    const lastError = this.errors[this.errors.length - 1] || null

    if (typeof lastError === 'string') {
      return new Error(lastError)
    }

    return lastError
  }

  /**
   * Enhances current Response returning a new Response
   *
   * @param {Object} extras
   *   @param {Integer} extras.status - it will replace the current status
   *   @param {String} extras.rawData - it will replace the current rawData
   *   @param {Object} extras.headers - it will be merged with current headers
   *   @param {Error} extras.error    - it will be added to the list of errors
   */
  public enhance(extras: ResponseParams) {
    const mergedHeaders = { ...this.headers(), ...(extras.headers || {}) }
    const enhancedResponse = new Response<DataType>(
      this.request(),
      extras.status || this.status(),
      extras.rawData || this.rawData(),
      mergedHeaders,
      extras.error ? [...this.errors, extras.error] : [...this.errors]
    )
    enhancedResponse.timeElapsed = this.timeElapsed

    return enhancedResponse
  }
}

export default Response
