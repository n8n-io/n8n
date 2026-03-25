export interface FetchResponseInit extends ResponseInit {
  url?: string
}

export class FetchResponse extends Response {
  /**
   * Response status codes for responses that cannot have body.
   * @see https://fetch.spec.whatwg.org/#statuses
   */
  static readonly STATUS_CODES_WITHOUT_BODY = [101, 103, 204, 205, 304]

  static readonly STATUS_CODES_WITH_REDIRECT = [301, 302, 303, 307, 308]

  static isConfigurableStatusCode(status: number): boolean {
    return status >= 200 && status <= 599
  }

  static isRedirectResponse(status: number): boolean {
    return FetchResponse.STATUS_CODES_WITH_REDIRECT.includes(status)
  }

  /**
   * Returns a boolean indicating whether the given response status
   * code represents a response that can have a body.
   */
  static isResponseWithBody(status: number): boolean {
    return !FetchResponse.STATUS_CODES_WITHOUT_BODY.includes(status)
  }

  static setUrl(url: string | undefined, response: Response): void {
    if (!url) {
      return
    }

    if (response.url != '') {
      return
    }

    Object.defineProperty(response, 'url', {
      value: url,
      enumerable: true,
      configurable: true,
      writable: false,
    })
  }

  /**
   * Parses the given raw HTTP headers into a Fetch API `Headers` instance.
   */
  static parseRawHeaders(rawHeaders: Array<string>): Headers {
    const headers = new Headers()
    for (let line = 0; line < rawHeaders.length; line += 2) {
      headers.append(rawHeaders[line], rawHeaders[line + 1])
    }
    return headers
  }

  constructor(body?: BodyInit | null, init: FetchResponseInit = {}) {
    const status = init.status ?? 200
    const safeStatus = FetchResponse.isConfigurableStatusCode(status)
      ? status
      : 200
    const finalBody = FetchResponse.isResponseWithBody(status) ? body : null

    super(finalBody, {
      ...init,
      status: safeStatus,
    })

    if (status !== safeStatus) {
      /**
       * @note Undici keeps an internal "Symbol(state)" that holds
       * the actual value of response status. Update that in Node.js.
       */
      const stateSymbol = Object.getOwnPropertySymbols(this).find(
        (symbol) => symbol.description === 'state'
      )
      if (stateSymbol) {
        const state = Reflect.get(this, stateSymbol) as object
        Reflect.set(state, 'status', status)
      } else {
        Object.defineProperty(this, 'status', {
          value: status,
          enumerable: true,
          configurable: true,
          writable: false,
        })
      }
    }

    FetchResponse.setUrl(init.url, this)
  }
}
