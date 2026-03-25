import { getTraceData } from './traceData.js';

/**
 * Returns a string of meta tags that represent the current trace data.
 *
 * You can use this to propagate a trace from your server-side rendered Html to the browser.
 * This function returns up to two meta tags, `sentry-trace` and `baggage`, depending on the
 * current trace data state.
 *
 * @example
 * Usage example:
 *
 * ```js
 * function renderHtml() {
 *   return `
 *     <head>
 *       ${getTraceMetaTags()}
 *     </head>
 *   `;
 * }
 * ```
 *
 */
function getTraceMetaTags(traceData) {
  return Object.entries(traceData || getTraceData())
    .map(([key, value]) => `<meta name="${key}" content="${value}"/>`)
    .join('\n');
}

export { getTraceMetaTags };
//# sourceMappingURL=meta.js.map
