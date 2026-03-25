/* eslint-disable @typescript-eslint/no-var-requires */
import { configs } from './mappersmith'
import { XHR } from './gateway/xhr'
import { HTTP } from './gateway/http'
import { Fetch } from './gateway/fetch'
import type { Gateway } from './gateway/index'
import type { GlobalConfigs, ManifestOptions, ResourceTypeConstraint } from './manifest'
let _process = null
let defaultGateway: typeof Gateway | null = null

// Prevents webpack to load the nodejs process polyfill
try {
  // eslint-disable-next-line no-eval
  _process = eval(
    'typeof __TEST_SERVICE_WORKER__ === "undefined" && typeof process === "object" ? process : undefined'
  )
} catch (e) {} // eslint-disable-line no-empty

if (typeof XMLHttpRequest !== 'undefined') {
  // For browsers use XHR adapter
  defaultGateway = XHR
} else if (typeof _process !== 'undefined') {
  // For node use HTTP adapter
  defaultGateway = HTTP
} else if (typeof self !== 'undefined') {
  // For service workers use fetch adapter
  defaultGateway = Fetch
}

configs.gateway = defaultGateway

export type { GlobalConfigs, ManifestOptions, ResourceTypeConstraint }
export type { Request, RequestContext } from './request'
export type {
  Primitive,
  Hash,
  Headers,
  Body,
  Params as Parameters,
  Auth as Authorization,
  NestedParam,
  NestedParamArray,
  RequestParams,
  ParameterEncoderFn,
} from './types'
export type { Gateway } from './gateway/index'
export type { XHR as XhrGateway } from './gateway/xhr'
export type { HTTP as HTTPGateway } from './gateway/http'
export type { Fetch as FetchGateway } from './gateway/fetch'
export type { Mock as MockGateway } from './gateway/mock'
export type {
  HTTPRequestParams,
  HTTPGatewayConfiguration,
  GatewayConfiguration,
} from './gateway/types'
export { Response } from './response'
export type { ParsedJSON } from './response'
export type {
  AbortFn,
  Context,
  Middleware,
  MiddlewareDescriptor,
  MiddlewareParams,
  RenewFn,
  RequestGetter,
  ResponseGetter,
} from './middleware/index'
export type { AsyncFunction, AsyncFunctions, Client, ClientBuilder } from './client-builder'
export type { MethodDescriptor, MethodDescriptorParams } from './method-descriptor'

/**
 * @deprecated, use ManifestOptions instead
 */
export type Options<Resources extends ResourceTypeConstraint> = ManifestOptions<Resources>

/**
 * @deprecated, use GlobalConfigs instead
 */
export type Configuration = GlobalConfigs
export { forge as default, forge, version, setContext } from './mappersmith'
export { configs }
