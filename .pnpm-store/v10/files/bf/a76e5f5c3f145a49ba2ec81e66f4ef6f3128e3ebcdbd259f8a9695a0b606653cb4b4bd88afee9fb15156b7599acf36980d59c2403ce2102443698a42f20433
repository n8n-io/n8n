import { Response } from '../response'
import type { Request } from '../request'
import type { Middleware } from './index'

export const defaultSuccessLogger = (message: string) => {
  const logger = console.info ? console.info : console.log
  logger(message)
}

export const defaultErrorLogger = (message: string) => {
  const logger = console.error ? console.error : console.log
  logger(message)
}

let isLoggerEnabled = Boolean(console && console.log)
let successLogger = defaultSuccessLogger
let errorLogger = defaultErrorLogger

export const setSuccessLogger = (logger: (message: string) => void) => {
  successLogger = logger
}
export const setErrorLogger = (logger: (message: string) => void) => {
  errorLogger = logger
}
export const setLoggerEnabled = (value: boolean) => {
  isLoggerEnabled = value
}

const log = (request: Request, response?: Response) => {
  if (isLoggerEnabled) {
    const httpCall = `${request.method().toUpperCase()} ${request.url()}`
    const direction = response ? '<-' : '->'
    const isError = response && !response.success()
    const errorLabel = isError ? '(ERROR) ' : ''
    const extra = response ? ` status=${response.status()} '${response.rawData()}'` : ''
    const logger = isError ? errorLogger : successLogger

    logger(`${direction} ${errorLabel}${httpCall}${extra}`)
  }

  return response || request
}

/**
 * Log all requests and responses.
 */
export const LogMiddleware: Middleware = () => ({
  async prepareRequest(next) {
    const request = await next()
    log(request)
    return request
  },

  async response(next) {
    try {
      const response = await next()
      log(response.request(), response)
      return response
    } catch (err) {
      if (err instanceof Response) {
        log(err.request(), err)
      }
      throw err
    }
  },
})

export default LogMiddleware
