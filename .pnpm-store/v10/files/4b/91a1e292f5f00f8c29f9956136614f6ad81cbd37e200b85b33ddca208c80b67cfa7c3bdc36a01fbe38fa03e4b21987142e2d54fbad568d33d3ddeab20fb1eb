import { defaultHost, defaultPort } from './constant.js'
import type { ErrorResponse, Fetch } from './interfaces.js'
import { version } from './version.js'

/**
 * An error class for response errors.
 * @extends Error
 */
class ResponseError extends Error {
  constructor(
    public error: string,
    public status_code: number,
  ) {
    super(error)
    this.name = 'ResponseError'

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ResponseError)
    }
  }
}

/**
 * An AsyncIterator which can be aborted
 */
export class AbortableAsyncIterator<T extends object> {
  private readonly abortController: AbortController
  private readonly itr: AsyncGenerator<T | ErrorResponse>
  private readonly doneCallback: () => void

  constructor(
    abortController: AbortController,
    itr: AsyncGenerator<T | ErrorResponse>,
    doneCallback: () => void,
  ) {
    this.abortController = abortController
    this.itr = itr
    this.doneCallback = doneCallback
  }

  abort() {
    this.abortController.abort()
  }

  async *[Symbol.asyncIterator]() {
    for await (const message of this.itr) {
      if ('error' in message) {
        throw new Error(message.error)
      }
      yield message
      // message will be done in the case of chat and generate
      // message will be success in the case of a progress response (pull, push, create)
      if ((message as any).done || (message as any).status === 'success') {
        this.doneCallback()
        return
      }
    }
    throw new Error('Did not receive done or success response in stream.')
  }
}

/**
 * Checks if the response is ok, if not throws an error.
 * If the response is not ok, it will try to parse the response as JSON and use the error field as the error message.
 * @param response {Response} - The response object to check
 */
const checkOk = async (response: Response): Promise<void> => {
  if (response.ok) {
    return
  }
  let message = `Error ${response.status}: ${response.statusText}`
  let errorData: ErrorResponse | null = null

  if (response.headers.get('content-type')?.includes('application/json')) {
    try {
      errorData = (await response.json()) as ErrorResponse
      message = errorData.error || message
    } catch (error) {
      console.log('Failed to parse error response as JSON')
    }
  } else {
    try {
      console.log('Getting text from response')
      const textResponse = await response.text()
      message = textResponse || message
    } catch (error) {
      console.log('Failed to get text from error response')
    }
  }

  throw new ResponseError(message, response.status)
}

/**
 * Returns the platform string based on the environment.
 * @returns {string} - The platform string
 */
function getPlatform(): string {
  if (typeof window !== 'undefined' && window.navigator) {
    // Need type assertion here since TypeScript doesn't know about userAgentData
    const nav = navigator as any
    if ('userAgentData' in nav && nav.userAgentData?.platform) {
      return `${nav.userAgentData.platform.toLowerCase()} Browser/${navigator.userAgent};`
    }
    if (navigator.platform) {
      return `${navigator.platform.toLowerCase()} Browser/${navigator.userAgent};`
    }
    return `unknown Browser/${navigator.userAgent};`
  } else if (typeof process !== 'undefined') {
    return `${process.arch} ${process.platform} Node.js/${process.version}`
  }
  return '' // unknown
}

/**
 * Normalizes headers into a plain object format.
 * This function handles various types of HeaderInit objects such as Headers, arrays of key-value pairs,
 * and plain objects, converting them all into an object structure.
 *
 * @param {HeadersInit|undefined} headers - The headers to normalize. Can be one of the following:
 *   - A `Headers` object from the Fetch API.
 *   - A plain object with key-value pairs representing headers.
 *   - An array of key-value pairs representing headers.
 * @returns {Record<string,string>} - A plain object representing the normalized headers.
 */
function normalizeHeaders(headers?: HeadersInit | undefined): Record<string, string> {
  if (headers instanceof Headers) {
    // If headers are an instance of Headers, convert it to an object
    const obj: Record<string, string> = {}
    headers.forEach((value, key) => {
      obj[key] = value
    })
    return obj
  } else if (Array.isArray(headers)) {
    // If headers are in array format, convert them to an object
    return Object.fromEntries(headers)
  } else {
    // Otherwise assume it's already a plain object
    return headers || {}
  }
}

const readEnvVar = (obj: object, key: string): string | undefined => {
  return obj[key]
}

/**
 * A wrapper around fetch that adds default headers.
 * @param fetch {Fetch} - The fetch function to use
 * @param url {string} - The URL to fetch
 * @param options {RequestInit} - The fetch options
 * @returns {Promise<Response>} - The fetch response
 */
const fetchWithHeaders = async (
  fetch: Fetch,
  url: string,
  options: RequestInit = {},
): Promise<Response> => {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'User-Agent': `ollama-js/${version} (${getPlatform()})`,
  } as HeadersInit

  // Normalizes headers into a plain object format.
  options.headers = normalizeHeaders(options.headers)

  // Automatically add the API key to the headers if the URL is https://ollama.com
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'https:' && parsed.hostname === 'ollama.com') {
      const apiKey =
        typeof process === 'object' &&
        process !== null &&
        typeof process.env === 'object' &&
        process.env !== null
          ? readEnvVar(process.env, 'OLLAMA_API_KEY')
          : undefined
      const authorization =
        options.headers['authorization'] || options.headers['Authorization']
      if (!authorization && apiKey) {
        options.headers['Authorization'] = `Bearer ${apiKey}`
      }
    }
  } catch (error) {
    console.error('error parsing url', error)
  }

  const customHeaders = Object.fromEntries(
    Object.entries(options.headers).filter(
      ([key]) =>
        !Object.keys(defaultHeaders).some(
          (defaultKey) => defaultKey.toLowerCase() === key.toLowerCase(),
        ),
    ),
  )

  options.headers = {
    ...defaultHeaders,
    ...customHeaders,
  }

  return fetch(url, options)
}

/**
 * A wrapper around the get method that adds default headers.
 * @param fetch {Fetch} - The fetch function to use
 * @param host {string} - The host to fetch
 * @returns {Promise<Response>} - The fetch response
 */
export const get = async (
  fetch: Fetch,
  host: string,
  options?: { headers?: HeadersInit },
): Promise<Response> => {
  const response = await fetchWithHeaders(fetch, host, {
    headers: options?.headers,
  })

  await checkOk(response)

  return response
}
/**
 * A wrapper around the head method that adds default headers.
 * @param fetch {Fetch} - The fetch function to use
 * @param host {string} - The host to fetch
 * @returns {Promise<Response>} - The fetch response
 */
export const head = async (fetch: Fetch, host: string): Promise<Response> => {
  const response = await fetchWithHeaders(fetch, host, {
    method: 'HEAD',
  })

  await checkOk(response)

  return response
}
/**
 * A wrapper around the post method that adds default headers.
 * @param fetch {Fetch} - The fetch function to use
 * @param host {string} - The host to fetch
 * @param data {Record<string, unknown> | BodyInit} - The data to send
 * @param options {{ signal: AbortSignal }} - The fetch options
 * @returns {Promise<Response>} - The fetch response
 */
export const post = async (
  fetch: Fetch,
  host: string,
  data?: Record<string, unknown> | BodyInit,
  options?: { signal?: AbortSignal; headers?: HeadersInit },
): Promise<Response> => {
  const isRecord = (input: any): input is Record<string, unknown> => {
    return input !== null && typeof input === 'object' && !Array.isArray(input)
  }

  const formattedData = isRecord(data) ? JSON.stringify(data) : data

  const response = await fetchWithHeaders(fetch, host, {
    method: 'POST',
    body: formattedData,
    signal: options?.signal,
    headers: options?.headers,
  })

  await checkOk(response)

  return response
}
/**
 * A wrapper around the delete method that adds default headers.
 * @param fetch {Fetch} - The fetch function to use
 * @param host {string} - The host to fetch
 * @param data {Record<string, unknown>} - The data to send
 * @returns {Promise<Response>} - The fetch response
 */
export const del = async (
  fetch: Fetch,
  host: string,
  data?: Record<string, unknown>,
  options?: { headers?: HeadersInit },
): Promise<Response> => {
  const response = await fetchWithHeaders(fetch, host, {
    method: 'DELETE',
    body: JSON.stringify(data),
    headers: options?.headers,
  })

  await checkOk(response)

  return response
}
/**
 * Parses a ReadableStream of Uint8Array into JSON objects.
 * @param itr {ReadableStream<Uint8Array>} - The stream to parse
 * @returns {AsyncGenerator<T>} - The parsed JSON objects
 */
export const parseJSON = async function* <T = unknown>(
  itr: ReadableStream<Uint8Array>,
): AsyncGenerator<T> {
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  const reader = itr.getReader()

  while (true) {
    const { done, value: chunk } = await reader.read()

    if (done) {
      break
    }

    buffer += decoder.decode(chunk, { stream: true })

    const parts = buffer.split('\n')

    buffer = parts.pop() ?? ''

    for (const part of parts) {
      try {
        yield JSON.parse(part)
      } catch (error) {
        console.warn('invalid json: ', part)
      }
    }
  }

  // Flush any remaining bytes from incomplete multibyte sequences
  buffer += decoder.decode()

  for (const part of buffer.split('\n').filter((p) => p !== '')) {
    try {
      yield JSON.parse(part)
    } catch (error) {
      console.warn('invalid json: ', part)
    }
  }
}
/**
 * Formats the host string to include the protocol and port.
 * @param host {string} - The host string to format
 * @returns {string} - The formatted host string
 */
export const formatHost = (host: string): string => {
  if (!host) {
    return defaultHost
  }

  let isExplicitProtocol = host.includes('://')

  if (host.startsWith(':')) {
    // if host starts with ':', prepend the default hostname
    host = `http://127.0.0.1${host}`
    isExplicitProtocol = true
  }

  if (!isExplicitProtocol) {
    host = `http://${host}`
  }

  const url = new URL(host)

  let port = url.port
  if (!port) {
    if (!isExplicitProtocol) {
      port = defaultPort
    } else {
      // Assign default ports based on the protocol
      port = url.protocol === 'https:' ? '443' : '80'
    }
  }

  // Build basic auth part if present
  let auth = ''
  if (url.username) {
    auth = url.username
    if (url.password) {
      auth += `:${url.password}`
    }
    auth += '@'
  }

  let formattedHost = `${url.protocol}//${auth}${url.hostname}:${port}${url.pathname}`
  // remove trailing slashes
  if (formattedHost.endsWith('/')) {
    formattedHost = formattedHost.slice(0, -1)
  }

  return formattedHost
}
