import type { Middleware } from './index'

/**
 * Adds started_at, ended_at and duration headers to the response
 */
export const DurationMiddleware: Middleware = ({ mockRequest }) => ({
  async prepareRequest(next) {
    if (mockRequest) {
      return next()
    }

    const request = await next()
    return request.enhance({
      headers: { 'X-Started-At': Date.now() },
    })
  },

  async response(next) {
    const response = await next()
    const endedAt = Date.now()
    const startedAt = response.request().header<number>('x-started-at') as number
    return response.enhance({
      headers: {
        'X-Started-At': startedAt,
        'X-Ended-At': endedAt,
        'X-Duration': endedAt - startedAt,
      },
    })
  },
})

export default DurationMiddleware
