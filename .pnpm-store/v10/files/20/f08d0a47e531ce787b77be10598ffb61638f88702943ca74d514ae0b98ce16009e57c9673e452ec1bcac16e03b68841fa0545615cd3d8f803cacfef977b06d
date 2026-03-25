/**
 * Fetch wrapper
 *
 * We want to polyfill fetch when not available with axios but use it when it is.
 * NOTE: The current version of Axios has an issue when in non-node environments like Clouflare Workers.
 * This is currently solved by using the global fetch if available instead.
 * See https://github.com/PostHog/posthog-js-lite/issues/127 for more info
 */
import { PostHogFetchOptions, PostHogFetchResponse } from 'posthog-core/src';
declare type FetchLike = (url: string, options: PostHogFetchOptions) => Promise<PostHogFetchResponse>;
declare const _default: FetchLike;
export default _default;
