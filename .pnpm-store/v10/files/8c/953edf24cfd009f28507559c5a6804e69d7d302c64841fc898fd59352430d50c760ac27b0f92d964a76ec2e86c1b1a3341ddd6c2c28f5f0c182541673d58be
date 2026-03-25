/**
 * @module
 * HTTP Status utility.
 */
export type InfoStatusCode = 100 | 101 | 102 | 103;
export type SuccessStatusCode = 200 | 201 | 202 | 203 | 204 | 205 | 206 | 207 | 208 | 226;
export type DeprecatedStatusCode = 305 | 306;
export type RedirectStatusCode = 300 | 301 | 302 | 303 | 304 | DeprecatedStatusCode | 307 | 308;
export type ClientErrorStatusCode = 400 | 401 | 402 | 403 | 404 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 421 | 422 | 423 | 424 | 425 | 426 | 428 | 429 | 431 | 451;
export type ServerErrorStatusCode = 500 | 501 | 502 | 503 | 504 | 505 | 506 | 507 | 508 | 510 | 511;
/**
 * `UnofficialStatusCode` can be used to specify an unofficial status code.
 * @example
 *
 * ```ts
 * app.get('/unknown', (c) => {
 *   return c.text("Unknown Error", 520 as UnofficialStatusCode)
 * })
 * ```
 */
export type UnofficialStatusCode = -1;
/**
 * @deprecated
 * Use `UnofficialStatusCode` instead.
 */
export type UnOfficalStatusCode = UnofficialStatusCode;
/**
 * If you want to use an unofficial status, use `UnofficialStatusCode`.
 */
export type StatusCode = InfoStatusCode | SuccessStatusCode | RedirectStatusCode | ClientErrorStatusCode | ServerErrorStatusCode | UnofficialStatusCode;
export type ContentlessStatusCode = 101 | 204 | 205 | 304;
export type ContentfulStatusCode = Exclude<StatusCode, ContentlessStatusCode>;
