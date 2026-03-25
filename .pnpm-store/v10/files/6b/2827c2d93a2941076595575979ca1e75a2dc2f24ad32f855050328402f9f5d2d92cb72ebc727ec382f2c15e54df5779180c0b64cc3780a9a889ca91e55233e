import { MethodDescriptor } from './method-descriptor'
import { toQueryString, lowerCaseObjectKeys, assign } from './utils/index'
import type {
  Auth,
  Body,
  Headers,
  NestedParam,
  NestedParamArray,
  Primitive,
  RequestParams,
} from './types'

const REGEXP_DYNAMIC_SEGMENT = /{([^}?]+)\??}/
const REGEXP_OPTIONAL_DYNAMIC_SEGMENT = /\/?{([^}?]+)\?}/g
const REGEXP_TRAILING_SLASH = /\/$/

export type RequestContext = Record<string, unknown>

/**
 * Removes the object type without removing Record types in the union
 */
export type ExcludeObject<T> = T extends object ? (object extends T ? never : T) : T

/**
 * @typedef Request
 * @param {MethodDescriptor} methodDescriptor
 * @param {RequestParams} requestParams, defaults to an empty object ({})
 * @param {RequestContext} request context store, defaults to an empty object ({})
 */
export class Request {
  public methodDescriptor: MethodDescriptor
  public requestParams: RequestParams
  private requestContext: RequestContext

  constructor(
    methodDescriptor: MethodDescriptor,
    requestParams: RequestParams = {},
    requestContext: RequestContext = {}
  ) {
    this.methodDescriptor = methodDescriptor
    this.requestParams = requestParams
    this.requestContext = requestContext
  }

  private isParam(key: string) {
    return (
      key !== this.methodDescriptor.headersAttr &&
      key !== this.methodDescriptor.bodyAttr &&
      key !== this.methodDescriptor.authAttr &&
      key !== this.methodDescriptor.timeoutAttr &&
      key !== this.methodDescriptor.hostAttr &&
      key !== this.methodDescriptor.signalAttr &&
      key !== this.methodDescriptor.pathAttr
    )
  }

  public params() {
    const params = assign({}, this.methodDescriptor.params, this.requestParams)

    return Object.keys(params).reduce((obj, key) => {
      if (this.isParam(key)) {
        obj[key] = params[key]
      }
      return obj
    }, {} as RequestParams)
  }

  /**
   * Returns the request context; a key value object.
   * Useful to pass information from upstream middleware to a downstream one.
   */
  public context<T extends RequestContext = RequestContext>() {
    return this.requestContext as T
  }

  /**
   * Returns the HTTP method in lowercase
   */
  public method() {
    return this.methodDescriptor.method.toLowerCase()
  }

  /**
   * Returns host name without trailing slash
   * Example: 'http://example.org'
   */
  public host() {
    const { allowResourceHostOverride, hostAttr, host } = this.methodDescriptor
    const originalHost = allowResourceHostOverride
      ? this.requestParams[hostAttr] || host || ''
      : host || ''

    if (typeof originalHost === 'string') {
      return originalHost.replace(REGEXP_TRAILING_SLASH, '')
    }

    return ''
  }

  /**
   * Returns path with parameters and leading slash.
   * Example: '/some/path?param1=true'
   *
   * @throws {Error} if any dynamic segment is missing.
   * Example:
   *  Imagine the path '/some/{name}', the error will be similar to:
   *    '[Mappersmith] required parameter missing (name), "/some/{name}" cannot be resolved'
   */
  public path() {
    const { pathAttr: mdPathAttr, path: mdPath } = this.methodDescriptor
    const originalPath = (this.requestParams[mdPathAttr] as RequestParams['path']) || mdPath || ''
    const params = this.params()

    let path: string
    if (typeof originalPath === 'function') {
      path = originalPath(params)
      if (typeof path !== 'string') {
        throw new Error(
          `[Mappersmith] method descriptor function did not return a string, params=${JSON.stringify(
            params
          )}`
        )
      }
    } else {
      path = originalPath
    }

    // RegExp with 'g'-flag is stateful, therefore defining it locally
    const regexp = new RegExp(REGEXP_DYNAMIC_SEGMENT, 'g')

    const dynamicSegmentKeys = []
    let match
    while ((match = regexp.exec(path)) !== null) {
      dynamicSegmentKeys.push(match[1])
    }

    for (const key of dynamicSegmentKeys) {
      const pattern = new RegExp(`{${key}\\??}`, 'g')
      const value = params[key]
      if (value != null && typeof value !== 'object') {
        path = path.replace(pattern, this.methodDescriptor.parameterEncoder(value))
        delete params[key]
      }
    }

    path = path.replace(REGEXP_OPTIONAL_DYNAMIC_SEGMENT, '')

    const missingDynamicSegmentMatch = path.match(REGEXP_DYNAMIC_SEGMENT)
    if (missingDynamicSegmentMatch) {
      throw new Error(
        `[Mappersmith] required parameter missing (${missingDynamicSegmentMatch[1]}), "${path}" cannot be resolved`
      )
    }

    const aliasedParams = Object.keys(params).reduce(
      (aliased, key) => {
        const aliasedKey = this.methodDescriptor.queryParamAlias[key] || key
        const value = params[key]
        if (value != null) {
          /**
           * Here we use `ExcludeObject` to surgically remove the `object` type from `value`.
           * We need it as `object` is too broad to be useful, whereas `value` is also typed
           * as NestedParam, which is the correct shape for param objects.
           */
          aliased[aliasedKey] = value as ExcludeObject<typeof value>
        }
        return aliased
      },
      {} as Record<string, Primitive | NestedParam | NestedParamArray>
    )

    const queryString = toQueryString(aliasedParams, this.methodDescriptor.parameterEncoder)
    if (typeof queryString === 'string' && queryString.length !== 0) {
      const hasQuery = path.includes('?')
      path += `${hasQuery ? '&' : '?'}${queryString}`
    }

    // https://www.rfc-editor.org/rfc/rfc1738#section-3.3
    if (path[0] !== '/' && path.length > 0) {
      path = `/${path}`
    }

    return path
  }

  /**
   * Returns the template path, without params, before interpolation.
   * If path is a function, returns the result of request.path()
   * Example: '/some/{param}/path'
   */
  public pathTemplate() {
    const path = this.methodDescriptor.path

    const prependSlash = (str: string) => (str[0] !== '/' ? `/${str}` : str)

    if (typeof path === 'function') {
      return prependSlash(path(this.params()))
    }

    return prependSlash(path)
  }

  /**
   * Returns the full URL
   * Example: http://example.org/some/path?param1=true
   *
   */
  public url() {
    return `${this.host()}${this.path()}`
  }

  /**
   * Returns an object with the headers. Header names are converted to
   * lowercase
   */
  public headers() {
    const headerAttr = this.methodDescriptor.headersAttr
    const headers = (this.requestParams[headerAttr] || {}) as Headers

    if (typeof headers === 'function') {
      return headers
    }

    const mergedHeaders = { ...this.methodDescriptor.headers, ...headers } as Headers
    return lowerCaseObjectKeys(mergedHeaders) as Headers
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

  public body() {
    return this.requestParams[this.methodDescriptor.bodyAttr] as Body | undefined
  }

  public auth() {
    return this.requestParams[this.methodDescriptor.authAttr] as Auth | undefined
  }

  public timeout() {
    return this.requestParams[this.methodDescriptor.timeoutAttr] as number | undefined
  }

  public signal() {
    return this.requestParams[this.methodDescriptor.signalAttr] as AbortSignal | undefined
  }

  /**
   * Enhances current request returning a new Request
   * @param {RequestParams} extras
   *   @param {Object} extras.auth - it will replace the current auth
   *   @param {String|Object} extras.body - it will replace the current body
   *   @param {Headers} extras.headers - it will be merged with current headers
   *   @param {String} extras.host - it will replace the current timeout
   *   @param {RequestParams} extras.params - it will be merged with current params
   *   @param {Number} extras.timeout - it will replace the current timeout
   * @param {Object} requestContext - Use to pass information between different middleware.
   */
  public enhance(extras: RequestParams, requestContext?: RequestContext) {
    const authKey = this.methodDescriptor.authAttr
    const bodyKey = this.methodDescriptor.bodyAttr
    const headerKey = this.methodDescriptor.headersAttr
    const hostKey = this.methodDescriptor.hostAttr
    const timeoutKey = this.methodDescriptor.timeoutAttr
    const pathKey = this.methodDescriptor.pathAttr
    const signalKey = this.methodDescriptor.signalAttr

    // Note: The result of merging an instance of RequestParams with instance of Params
    // is simply a RequestParams with even more [param: string]'s on it.
    const requestParams: RequestParams = assign({}, this.requestParams, extras.params)

    const headers = this.requestParams[headerKey] as Headers | undefined
    const mergedHeaders = assign({}, headers, extras.headers)
    requestParams[headerKey] = mergedHeaders

    extras.auth && (requestParams[authKey] = extras.auth)
    extras.body && (requestParams[bodyKey] = extras.body)
    extras.host && (requestParams[hostKey] = extras.host)
    extras.timeout && (requestParams[timeoutKey] = extras.timeout)
    extras.path && (requestParams[pathKey] = extras.path)
    extras.signal && (requestParams[signalKey] = extras.signal)

    const nextContext = { ...this.requestContext, ...requestContext }

    return new Request(this.methodDescriptor, requestParams, nextContext)
  }

  /**
   * Is the request expecting a binary response?
   */
  public isBinary() {
    return this.methodDescriptor.binary
  }
}

export default Request
