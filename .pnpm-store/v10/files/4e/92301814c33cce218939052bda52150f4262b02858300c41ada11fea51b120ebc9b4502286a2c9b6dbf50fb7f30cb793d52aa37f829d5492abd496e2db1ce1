// Using default imports instead of namespace imports, because namespace imports
// would create an object with new references to the module's original exports,
// thus ignoring any patches done to the modules by end users
import url from 'url'
import http from 'http'
import https from 'https'

import { assign } from '../utils/index'
import { Gateway } from './gateway'
import type { Method, HTTPGatewayConfiguration, HTTPRequestParams } from './types'
import Response from '../response'
import { createTimeoutError } from './timeout-error'
import type { Primitive } from '../types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Chunk = any

export class HTTP extends Gateway {
  private canceled = false

  get() {
    this.performRequest('get')
  }

  head() {
    this.performRequest('head')
  }

  post() {
    this.performRequest('post')
  }

  put() {
    this.performRequest('put')
  }

  patch() {
    this.performRequest('patch')
  }

  delete() {
    this.performRequest('delete')
  }

  performRequest(requestMethod: Method) {
    const headers: Record<string, Primitive> = {}
    // FIXME: Deprecated API
    const defaults = url.parse(this.request.url())
    const method = this.shouldEmulateHTTP() ? 'post' : requestMethod
    const body = this.prepareBody(requestMethod, headers)
    const timeout = this.request.timeout()
    const signal = this.request.signal()

    this.canceled = false

    if (
      body &&
      typeof body !== 'boolean' &&
      typeof body !== 'number' &&
      typeof body.length === 'number'
    ) {
      headers['content-length'] = Buffer.byteLength(body)
    }

    const handler = defaults.protocol === 'https:' ? https : http

    const requestParams: http.RequestOptions = assign(defaults, {
      method,
      headers: assign(headers, this.request.headers() as http.OutgoingHttpHeaders),
    })

    const auth = this.request.auth()
    if (auth) {
      const username = auth.username || ''
      const password = auth.password || ''
      requestParams['auth'] = `${username}:${password}`
    }

    const httpOptions = this.options().HTTP

    if (httpOptions.useSocketConnectionTimeout) {
      requestParams['timeout'] = timeout
    }

    if (httpOptions.configure) {
      assign(requestParams, httpOptions.configure(requestParams))
    }

    if (httpOptions.onRequestWillStart) {
      httpOptions.onRequestWillStart(requestParams)
    }

    if (signal) {
      requestParams.signal = signal
    }

    const httpRequest = handler.request(requestParams, (httpResponse) =>
      this.onResponse(httpResponse, httpOptions, requestParams)
    )

    httpRequest.on('socket', (socket) => {
      if (httpOptions.onRequestSocketAssigned) {
        httpOptions.onRequestSocketAssigned(requestParams)
      }

      if (httpRequest.reusedSocket) {
        return
      }

      if (httpOptions.onSocketLookup) {
        socket.on('lookup', () => {
          httpOptions.onSocketLookup?.(requestParams)
        })
      }
      if (httpOptions.onSocketConnect) {
        socket.on('connect', () => {
          httpOptions.onSocketConnect?.(requestParams)
        })
      }
      if (httpOptions.onSocketSecureConnect) {
        socket.on('secureConnect', () => {
          httpOptions.onSocketSecureConnect?.(requestParams)
        })
      }
    })

    httpRequest.on('error', (e) => this.onError(e))
    body && httpRequest.write(body)

    if (timeout) {
      if (!httpOptions.useSocketConnectionTimeout) {
        httpRequest.setTimeout(timeout)
      }

      httpRequest.on('timeout', () => {
        this.canceled = true
        httpRequest.abort()
        const error = createTimeoutError(`Timeout (${timeout}ms)`)
        this.dispatchClientError(error.message, error)
      })
    }

    httpRequest.end()
  }

  onResponse(
    httpResponse: http.IncomingMessage,
    httpOptions: Partial<HTTPGatewayConfiguration>,
    requestParams: HTTPRequestParams
  ) {
    const rawData: Chunk[] = []

    if (!this.request.isBinary()) {
      httpResponse.setEncoding('utf8')
    }

    httpResponse.once('readable', () => {
      if (httpOptions.onResponseReadable) {
        httpOptions.onResponseReadable(requestParams)
      }
    })

    httpResponse
      .on('data', (chunk) => rawData.push(chunk))
      .on('end', () => {
        if (this.canceled) {
          return
        }

        this.dispatchResponse(this.createResponse(httpResponse, rawData))
      })

    httpResponse.on('end', () => {
      if (httpOptions.onResponseEnd) {
        httpOptions.onResponseEnd(requestParams)
      }
    })
  }

  onError(e: Error) {
    if (this.canceled) {
      return
    }

    this.dispatchClientError(e.message, e)
  }

  createResponse(httpResponse: http.IncomingMessage, rawData: Chunk) {
    const responseData = this.request.isBinary() ? Buffer.concat(rawData) : rawData.join('')

    return new Response(
      this.request,
      httpResponse.statusCode as number,
      responseData,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      httpResponse.headers as any
    )
  }
}

export default HTTP
