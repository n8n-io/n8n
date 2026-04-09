/**
 * Gets the current OIDC token from the request context or the environment variable.
 *
 * Do not cache this value, as it is subject to change in production!
 *
 * This function is used to retrieve the OIDC token from the request context or the environment variable.
 * It checks for the `x-vercel-oidc-token` header in the request context and falls back to the `VERCEL_OIDC_TOKEN` environment variable if the header is not present.
 *
 * Unlike the `getVercelOidcTokenSync` function, this function will refresh the token if it is expired in a development environment.
 *
 * @returns {Promise<string>} A promise that resolves to the OIDC token.
 * @throws {Error} If the `x-vercel-oidc-token` header is missing from the request context and the environment variable `VERCEL_OIDC_TOKEN` is not set. If the token
 * is expired in a development environment, will also throw an error if the token cannot be refreshed: no CLI credentials are available, CLI credentials are expired, no project configuration is available
 * or the token refresh request fails.
 *
 * @example
 *
 * ```js
 * // Using the OIDC token
 * getVercelOidcToken().then((token) => {
 *   console.log('OIDC Token:', token);
 * }).catch((error) => {
 *   console.error('Error:', error.message);
 * });
 * ```
 */
export declare function getVercelOidcToken(): Promise<string>;
/**
 * Gets the current OIDC token from the request context or the environment variable.
 *
 * Do not cache this value, as it is subject to change in production!
 *
 * This function is used to retrieve the OIDC token from the request context or the environment variable.
 * It checks for the `x-vercel-oidc-token` header in the request context and falls back to the `VERCEL_OIDC_TOKEN` environment variable if the header is not present.
 *
 * This function will not refresh the token if it is expired. For refreshing the token, use the @{link getVercelOidcToken} function.
 *
 * @returns {string} The OIDC token.
 * @throws {Error} If the `x-vercel-oidc-token` header is missing from the request context and the environment variable `VERCEL_OIDC_TOKEN` is not set.
 *
 * @example
 *
 * ```js
 * // Using the OIDC token
 * const token = getVercelOidcTokenSync();
 * console.log('OIDC Token:', token);
 * ```
 */
export declare function getVercelOidcTokenSync(): string;
