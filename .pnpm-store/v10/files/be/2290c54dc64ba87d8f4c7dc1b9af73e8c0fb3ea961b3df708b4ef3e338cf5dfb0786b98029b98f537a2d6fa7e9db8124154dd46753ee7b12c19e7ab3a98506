export type Fetch = typeof fetch

/**
 * Response format
 *
 */
export interface FunctionsResponseSuccess<T> {
  data: T
  error: null
}
export interface FunctionsResponseFailure {
  data: null
  error: any
}
export type FunctionsResponse<T> = FunctionsResponseSuccess<T> | FunctionsResponseFailure

export class FunctionsError extends Error {
  context: any
  constructor(message: string, name = 'FunctionsError', context?: any) {
    super(message)
    this.name = name
    this.context = context
  }
}

export class FunctionsFetchError extends FunctionsError {
  constructor(context: any) {
    super('Failed to send a request to the Edge Function', 'FunctionsFetchError', context)
  }
}

export class FunctionsRelayError extends FunctionsError {
  constructor(context: any) {
    super('Relay Error invoking the Edge Function', 'FunctionsRelayError', context)
  }
}

export class FunctionsHttpError extends FunctionsError {
  constructor(context: any) {
    super('Edge Function returned a non-2xx status code', 'FunctionsHttpError', context)
  }
}
// Define the enum for the 'region' property
export enum FunctionRegion {
  Any = 'any',
  ApNortheast1 = 'ap-northeast-1',
  ApNortheast2 = 'ap-northeast-2',
  ApSouth1 = 'ap-south-1',
  ApSoutheast1 = 'ap-southeast-1',
  ApSoutheast2 = 'ap-southeast-2',
  CaCentral1 = 'ca-central-1',
  EuCentral1 = 'eu-central-1',
  EuWest1 = 'eu-west-1',
  EuWest2 = 'eu-west-2',
  EuWest3 = 'eu-west-3',
  SaEast1 = 'sa-east-1',
  UsEast1 = 'us-east-1',
  UsWest1 = 'us-west-1',
  UsWest2 = 'us-west-2',
}

export type FunctionInvokeOptions = {
  /**
   * Object representing the headers to send with the request.
   * */
  headers?: { [key: string]: string }
  /**
   * The HTTP verb of the request
   */
  method?: 'POST' | 'GET' | 'PUT' | 'PATCH' | 'DELETE'
  /**
   * The Region to invoke the function in.
   */
  region?: FunctionRegion
  /**
   * The body of the request.
   */
  body?:
    | File
    | Blob
    | ArrayBuffer
    | FormData
    | ReadableStream<Uint8Array>
    | Record<string, any>
    | string
}
