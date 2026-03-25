import { Gateway } from './gateway'
import Response from '../response'
import type { Method } from './types'
import type { Headers } from '../types'
import { assign, parseResponseHeaders, btoa } from '../utils/index'
import { createTimeoutError } from './timeout-error'

let toBase64: (data: string) => string
try {
  toBase64 = window.btoa
} catch {
  toBase64 = btoa
}

export class XHR extends Gateway {
  private canceled = false
  private timer?: ReturnType<typeof setTimeout>

  get() {
    const xmlHttpRequest = this.createXHR()
    xmlHttpRequest.open('GET', this.request.url(), true)
    this.setHeaders(xmlHttpRequest, {})
    this.configureTimeout(xmlHttpRequest)
    this.configureBinary(xmlHttpRequest)
    this.configureAbort(xmlHttpRequest)
    xmlHttpRequest.send()
  }

  head() {
    const xmlHttpRequest = this.createXHR()
    xmlHttpRequest.open('HEAD', this.request.url(), true)
    this.setHeaders(xmlHttpRequest, {})
    this.configureTimeout(xmlHttpRequest)
    this.configureBinary(xmlHttpRequest)
    this.configureAbort(xmlHttpRequest)
    xmlHttpRequest.send()
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

  configureBinary(xmlHttpRequest: XMLHttpRequest) {
    if (this.request.isBinary()) {
      xmlHttpRequest.responseType = 'blob'
    }
  }

  configureTimeout(xmlHttpRequest: XMLHttpRequest) {
    this.canceled = false
    this.timer = undefined

    const timeout = this.request.timeout()

    if (timeout) {
      xmlHttpRequest.timeout = timeout
      xmlHttpRequest.addEventListener('timeout', () => {
        this.canceled = true
        this.timer && clearTimeout(this.timer)
        const error = createTimeoutError(`Timeout (${timeout}ms)`)
        this.dispatchClientError(error.message, error)
      })

      // PhantomJS doesn't support timeout for XMLHttpRequest
      this.timer = setTimeout(() => {
        this.canceled = true
        const error = createTimeoutError(`Timeout (${timeout}ms)`)
        this.dispatchClientError(error.message, error)
      }, timeout + 1)
    }
  }

  configureAbort(xmlHttpRequest: XMLHttpRequest) {
    const signal = this.request.signal()
    if (signal) {
      signal.addEventListener('abort', () => {
        xmlHttpRequest.abort()
      })
      xmlHttpRequest.addEventListener('abort', () => {
        this.dispatchClientError(
          'The operation was aborted',
          new Error('The operation was aborted')
        )
      })
    }
  }

  configureCallbacks(xmlHttpRequest: XMLHttpRequest) {
    xmlHttpRequest.addEventListener('load', () => {
      if (this.canceled) {
        return
      }

      this.timer && clearTimeout(this.timer)
      this.dispatchResponse(this.createResponse(xmlHttpRequest))
    })

    xmlHttpRequest.addEventListener('error', (e) => {
      if (this.canceled) {
        return
      }

      this.timer && clearTimeout(this.timer)
      const guessedErrorCause = e
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (e as any).message || (e as any).name
        : xmlHttpRequest.responseText

      const errorMessage = 'Network error'
      const enhancedMessage = guessedErrorCause ? `: ${guessedErrorCause}` : ''
      const error = new Error(`${errorMessage}${enhancedMessage}`)
      this.dispatchClientError(errorMessage, error)
    })

    const xhrOptions = this.options().XHR

    if (xhrOptions.withCredentials) {
      xmlHttpRequest.withCredentials = true
    }

    if (xhrOptions.configure) {
      xhrOptions.configure(xmlHttpRequest)
    }
  }

  performRequest(method: Method) {
    const requestMethod = this.shouldEmulateHTTP() ? 'post' : method
    const xmlHttpRequest = this.createXHR()
    xmlHttpRequest.open(requestMethod.toUpperCase(), this.request.url(), true)

    const customHeaders: Headers = {}
    const body = this.prepareBody(method, customHeaders) as XMLHttpRequestBodyInit
    this.setHeaders(xmlHttpRequest, customHeaders)
    this.configureTimeout(xmlHttpRequest)
    this.configureBinary(xmlHttpRequest)
    this.configureAbort(xmlHttpRequest)

    xmlHttpRequest.send(body)
  }

  createResponse(xmlHttpRequest: XMLHttpRequest) {
    const status = xmlHttpRequest.status
    const data = this.request.isBinary() ? xmlHttpRequest.response : xmlHttpRequest.responseText
    const responseHeaders = parseResponseHeaders(xmlHttpRequest.getAllResponseHeaders())
    return new Response(this.request, status, data, responseHeaders)
  }

  setHeaders(xmlHttpRequest: XMLHttpRequest, customHeaders: Headers) {
    const auth = this.request.auth()
    const headers = assign(customHeaders, {
      ...this.request.headers(),
      ...(auth ? { authorization: `Basic ${toBase64(`${auth.username}:${auth.password}`)}` } : {}),
    })

    Object.keys(headers).forEach((headerName) => {
      xmlHttpRequest.setRequestHeader(headerName, `${headers[headerName]}`)
    })
  }

  createXHR() {
    const xmlHttpRequest = new XMLHttpRequest()
    this.configureCallbacks(xmlHttpRequest)
    return xmlHttpRequest
  }
}

export default XHR
