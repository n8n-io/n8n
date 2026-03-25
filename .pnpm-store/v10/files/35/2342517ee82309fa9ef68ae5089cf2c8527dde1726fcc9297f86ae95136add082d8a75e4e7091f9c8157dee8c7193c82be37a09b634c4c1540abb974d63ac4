import { Gateway } from './gateway'
import Response from '../response'
import { configs } from '../mappersmith'
// Fetch can be used in nodejs, so it should always use the btoa util
import { assign, btoa } from '../utils/index'
import { createTimeoutError } from './timeout-error'
import type { Method } from './types'

/**
 * Gateway which uses the "fetch" implementation configured in "configs.fetch".
 * By default "configs.fetch" will receive the global fetch, this gateway doesn't
 * use browser specific code, with a proper "fetch" implementation it can also be
 * used with node.js
 */
export class Fetch extends Gateway {
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
    const fetch = configs.fetch

    if (!fetch) {
      throw new Error(
        `[Mappersmith] global fetch does not exist, please assign "configs.fetch" to a valid implementation`
      )
    }

    const customHeaders: Record<string, string> = {}
    const body = this.prepareBody(requestMethod, customHeaders) as BodyInit
    const auth = this.request.auth()

    if (auth) {
      const username = auth.username || ''
      const password = auth.password || ''
      customHeaders['authorization'] = `Basic ${btoa(`${username}:${password}`)}`
    }

    const headers = assign(customHeaders, this.request.headers())
    const method = this.shouldEmulateHTTP() ? 'post' : requestMethod
    const signal = this.request.signal()
    const init: RequestInit = assign({ method, headers, body, signal }, this.options().Fetch)
    const timeout = this.request.timeout()

    let timer: ReturnType<typeof setTimeout> | null = null
    let canceled = false

    if (timeout) {
      timer = setTimeout(() => {
        canceled = true
        const error = createTimeoutError(`Timeout (${timeout}ms)`)
        this.dispatchClientError(error.message, error)
      }, timeout)
    }

    fetch(this.request.url(), init)
      .then((fetchResponse) => {
        if (canceled) {
          return
        }

        timer && clearTimeout(timer)

        let responseData: Promise<ArrayBuffer> | Promise<string> | Promise<Buffer>
        if (this.request.isBinary()) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (typeof (fetchResponse as any).buffer === 'function') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            responseData = (fetchResponse as any).buffer()
          } else {
            responseData = fetchResponse.arrayBuffer()
          }
        } else {
          responseData = fetchResponse.text()
        }

        responseData.then((data) => {
          this.dispatchResponse(this.createResponse(fetchResponse, data))
        })
      })
      .catch((error) => {
        if (canceled) {
          return
        }

        timer && clearTimeout(timer)
        this.dispatchClientError(error.message, error)
      })
  }

  createResponse(fetchResponse: globalThis.Response, data: string | ArrayBuffer | Buffer) {
    const status = fetchResponse.status
    const responseHeaders: Record<string, string> = {}
    fetchResponse.headers.forEach((value, key) => {
      responseHeaders[key] = value
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Response(this.request, status, data as any, responseHeaders)
  }
}

export default Fetch
