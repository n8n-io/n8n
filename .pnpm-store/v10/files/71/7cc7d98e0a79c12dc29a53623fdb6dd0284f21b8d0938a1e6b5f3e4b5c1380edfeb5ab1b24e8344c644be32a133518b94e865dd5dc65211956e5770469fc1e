import { REGEXP_CONTENT_TYPE_JSON } from '../response'
import type { Middleware } from './index'

export const CONTENT_TYPE_JSON = 'application/json;charset=utf-8'

const isJson = (contentType: string) => REGEXP_CONTENT_TYPE_JSON.test(contentType)
const alreadyEncoded = (body: unknown) => typeof body === 'string'

/**
 * Automatically encode your objects into JSON
 *
 * Example:
 * client.User.all({ body: { name: 'bob' } })
 * // => body: {"name":"bob"}
 * // => header: "Content-Type=application/json;charset=utf-8"
 */
export const EncodeJsonMiddleware: Middleware = () => ({
  async prepareRequest(next) {
    const request = await next()
    try {
      const body = request.body()
      const contentType = request.header('content-type')

      if (body) {
        const shouldEncodeBody =
          contentType == null ||
          (typeof contentType === 'string' && isJson(contentType) && !alreadyEncoded(body))
        const encodedBody = shouldEncodeBody ? JSON.stringify(body) : body

        return request.enhance({
          headers: { 'content-type': contentType == null ? CONTENT_TYPE_JSON : contentType },
          body: encodedBody,
        })
      }
    } catch (_e) {} // eslint-disable-line no-empty
    return request
  },
})

export default EncodeJsonMiddleware
