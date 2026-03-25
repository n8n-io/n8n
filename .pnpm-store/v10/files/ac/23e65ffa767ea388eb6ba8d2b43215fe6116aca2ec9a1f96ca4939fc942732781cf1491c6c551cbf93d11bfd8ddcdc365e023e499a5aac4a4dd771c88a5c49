/**
 * Fetch wrapper
 *
 * We want to polyfill fetch when not available with axios but use it when it is.
 * NOTE: The current version of Axios has an issue when in non-node environments like Clouflare Workers.
 * This is currently solved by using the global fetch if available instead.
 * See https://github.com/PostHog/posthog-js-lite/issues/127 for more info
 */

import { PostHogFetchOptions, PostHogFetchResponse } from 'posthog-core/src'

type FetchLike = (url: string, options: PostHogFetchOptions) => Promise<PostHogFetchResponse>

let _fetch: FetchLike | undefined =
  // eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
  // @ts-ignore
  typeof fetch !== 'undefined' ? fetch : typeof global.fetch !== 'undefined' ? global.fetch : undefined

if (!_fetch) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const axios = require('axios')

  _fetch = async (url: string, options: PostHogFetchOptions): Promise<PostHogFetchResponse> => {
    const res = await axios.request({
      url,
      headers: options.headers,
      method: options.method.toLowerCase(),
      data: options.body,
      signal: options.signal,
      // fetch only throws on network errors, not on HTTP errors
      validateStatus: () => true,
    })

    return {
      status: res.status,
      text: async () => res.data,
      json: async () => res.data,
    }
  }
}

// NOTE: We have to export this as default, even though we prefer named exports as we are relying on detecting "fetch" in the global scope
export default _fetch as FetchLike
