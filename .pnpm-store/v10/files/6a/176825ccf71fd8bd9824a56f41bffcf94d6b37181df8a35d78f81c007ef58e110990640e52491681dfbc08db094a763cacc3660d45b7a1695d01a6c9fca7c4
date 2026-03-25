import { resolveFetch } from './helper'
import {
  Fetch,
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
  FunctionsResponse,
  FunctionInvokeOptions,
  FunctionRegion,
} from './types'

export class FunctionsClient {
  protected url: string
  protected headers: Record<string, string>
  protected region: FunctionRegion
  protected fetch: Fetch

  constructor(
    url: string,
    {
      headers = {},
      customFetch,
      region = FunctionRegion.Any,
    }: {
      headers?: Record<string, string>
      customFetch?: Fetch
      region?: FunctionRegion
    } = {}
  ) {
    this.url = url
    this.headers = headers
    this.region = region
    this.fetch = resolveFetch(customFetch)
  }

  /**
   * Updates the authorization header
   * @param token - the new jwt token sent in the authorisation header
   */
  setAuth(token: string) {
    this.headers.Authorization = `Bearer ${token}`
  }

  /**
   * Invokes a function
   * @param functionName - The name of the Function to invoke.
   * @param options - Options for invoking the Function.
   */
  async invoke<T = any>(
    functionName: string,
    options: FunctionInvokeOptions = {}
  ): Promise<FunctionsResponse<T>> {
    try {
      const { headers, method, body: functionArgs } = options
      let _headers: Record<string, string> = {}
      let { region } = options
      if (!region) {
        region = this.region
      }
      if (region && region !== 'any') {
        _headers['x-region'] = region
      }
      let body: any
      if (
        functionArgs &&
        ((headers && !Object.prototype.hasOwnProperty.call(headers, 'Content-Type')) || !headers)
      ) {
        if (
          (typeof Blob !== 'undefined' && functionArgs instanceof Blob) ||
          functionArgs instanceof ArrayBuffer
        ) {
          // will work for File as File inherits Blob
          // also works for ArrayBuffer as it is the same underlying structure as a Blob
          _headers['Content-Type'] = 'application/octet-stream'
          body = functionArgs
        } else if (typeof functionArgs === 'string') {
          // plain string
          _headers['Content-Type'] = 'text/plain'
          body = functionArgs
        } else if (typeof FormData !== 'undefined' && functionArgs instanceof FormData) {
          // don't set content-type headers
          // Request will automatically add the right boundary value
          body = functionArgs
        } else {
          // default, assume this is JSON
          _headers['Content-Type'] = 'application/json'
          body = JSON.stringify(functionArgs)
        }
      }

      const response = await this.fetch(`${this.url}/${functionName}`, {
        method: method || 'POST',
        // headers priority is (high to low):
        // 1. invoke-level headers
        // 2. client-level headers
        // 3. default Content-Type header
        headers: { ..._headers, ...this.headers, ...headers },
        body,
      }).catch((fetchError) => {
        throw new FunctionsFetchError(fetchError)
      })

      const isRelayError = response.headers.get('x-relay-error')
      if (isRelayError && isRelayError === 'true') {
        throw new FunctionsRelayError(response)
      }

      if (!response.ok) {
        throw new FunctionsHttpError(response)
      }

      let responseType = (response.headers.get('Content-Type') ?? 'text/plain').split(';')[0].trim()
      let data: any
      if (responseType === 'application/json') {
        data = await response.json()
      } else if (responseType === 'application/octet-stream') {
        data = await response.blob()
      } else if (responseType === 'text/event-stream') {
        data = response
      } else if (responseType === 'multipart/form-data') {
        data = await response.formData()
      } else {
        // default to text
        data = await response.text()
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }
}
