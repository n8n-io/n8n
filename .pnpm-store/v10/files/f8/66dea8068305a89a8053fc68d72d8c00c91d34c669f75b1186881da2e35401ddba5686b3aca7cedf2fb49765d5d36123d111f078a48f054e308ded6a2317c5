import type { SSGPlugin } from './ssg';
/**
 * The default plugin that defines the recommended behavior.
 *
 * @experimental
 * `defaultPlugin` is an experimental feature.
 * The API might be changed.
 */
export declare const defaultPlugin: () => SSGPlugin;
/**
 * The redirect plugin that generates HTML redirect pages for HTTP redirect responses for status codes 301, 302, 303, 307 and 308.
 *
 * When used with `defaultPlugin`, place `redirectPlugin` before it, because `defaultPlugin` skips non-200 responses.
 *
 * ```ts
 * // ✅ Will work as expected
 * toSSG(app, fs, { plugins: [redirectPlugin(), defaultPlugin()] })
 *
 * // ❌ Will not work as expected
 * toSSG(app, fs, { plugins: [defaultPlugin(), redirectPlugin()] })
 * ```
 *
 * @experimental
 * `redirectPlugin` is an experimental feature.
 * The API might be changed.
 */
export declare const redirectPlugin: () => SSGPlugin;
