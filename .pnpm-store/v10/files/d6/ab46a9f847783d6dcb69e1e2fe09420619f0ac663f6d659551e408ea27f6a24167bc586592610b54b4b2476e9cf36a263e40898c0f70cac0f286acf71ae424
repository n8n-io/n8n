import type { Headers, RequestParams, ParameterEncoderFn, Params } from './types'
import type { Middleware } from './middleware/index'

export interface MethodDescriptorParams {
  allowResourceHostOverride?: boolean
  authAttr?: string
  binary?: boolean
  bodyAttr?: string
  headers?: Headers
  headersAttr?: string
  host: string
  hostAttr?: string
  method?: string
  middleware?: Array<Middleware>
  middlewares?: Array<Middleware>
  parameterEncoder?: ParameterEncoderFn
  params?: Params
  path: string | ((args: RequestParams) => string)
  pathAttr?: string
  queryParamAlias?: Record<string, string>
  signalAttr?: string
  timeoutAttr?: string
}

/**
 * @typedef MethodDescriptor
 * @param {MethodDescriptorParams} params
 *   @param {boolean} params.allowResourceHostOverride
 *   @param {Function} params.parameterEncoder
 *   @param {String} params.authAttr - auth attribute name. Default: 'auth'
 *   @param {boolean} params.binary
 *   @param {String} params.bodyAttr - body attribute name. Default: 'body'
 *   @param {Headers} params.headers
 *   @param {String} params.headersAttr - headers attribute name. Default: 'headers'
 *   @param {String} params.host
 *   @param {String} params.hostAttr - host attribute name. Default: 'host'
 *   @param {String} params.method
 *   @param {Middleware[]} params.middleware
 *   @param {Middleware[]} params.middlewares - alias for middleware
 *   @param {RequestParams} params.params
 *   @param {String|Function} params.path
 *   @param {String} params.pathAttr. Default: 'path'
 *   @param {Object} params.queryParamAlias
 *   @param {Number} params.signalAttr - signal attribute name. Default: 'signal'
 *   @param {Number} params.timeoutAttr - timeout attribute name. Default: 'timeout'
 */
export class MethodDescriptor {
  public readonly allowResourceHostOverride: boolean
  public readonly authAttr: string
  public readonly binary: boolean
  public readonly bodyAttr: string
  public readonly headers?: Headers
  public readonly headersAttr: string
  public readonly host: string
  public readonly hostAttr: string
  public readonly method: string
  public readonly middleware: Middleware[]
  public readonly parameterEncoder: ParameterEncoderFn
  public readonly params?: RequestParams
  public readonly path: string | ((args: RequestParams) => string)
  public readonly pathAttr: string
  public readonly queryParamAlias: Record<string, string>
  public readonly signalAttr: string
  public readonly timeoutAttr: string

  constructor(params: MethodDescriptorParams) {
    this.allowResourceHostOverride = params.allowResourceHostOverride || false
    this.binary = params.binary || false
    this.headers = params.headers
    this.host = params.host
    this.method = params.method || 'get'
    this.parameterEncoder = params.parameterEncoder || encodeURIComponent
    this.params = params.params
    this.path = params.path
    this.queryParamAlias = params.queryParamAlias || {}

    this.authAttr = params.authAttr || 'auth'
    this.bodyAttr = params.bodyAttr || 'body'
    this.headersAttr = params.headersAttr || 'headers'
    this.hostAttr = params.hostAttr || 'host'
    this.pathAttr = params.pathAttr || 'path'
    this.signalAttr = params.signalAttr || 'signal'
    this.timeoutAttr = params.timeoutAttr || 'timeout'

    const resourceMiddleware = params.middleware || params.middlewares || []
    this.middleware = resourceMiddleware
  }
}

export default MethodDescriptor
