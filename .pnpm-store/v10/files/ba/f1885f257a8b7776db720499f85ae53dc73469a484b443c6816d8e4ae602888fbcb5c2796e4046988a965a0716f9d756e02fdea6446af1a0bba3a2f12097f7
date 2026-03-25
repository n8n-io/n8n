import { auth, extractWWWAuthenticateParams, UnauthorizedError } from './auth.js';
/**
 * Creates a fetch wrapper that handles OAuth authentication automatically.
 *
 * This wrapper will:
 * - Add Authorization headers with access tokens
 * - Handle 401 responses by attempting re-authentication
 * - Retry the original request after successful auth
 * - Handle OAuth errors appropriately (InvalidClientError, etc.)
 *
 * The baseUrl parameter is optional and defaults to using the domain from the request URL.
 * However, you should explicitly provide baseUrl when:
 * - Making requests to multiple subdomains (e.g., api.example.com, cdn.example.com)
 * - Using API paths that differ from OAuth discovery paths (e.g., requesting /api/v1/data but OAuth is at /)
 * - The OAuth server is on a different domain than your API requests
 * - You want to ensure consistent OAuth behavior regardless of request URLs
 *
 * For MCP transports, set baseUrl to the same URL you pass to the transport constructor.
 *
 * Note: This wrapper is designed for general-purpose fetch operations.
 * MCP transports (SSE and StreamableHTTP) already have built-in OAuth handling
 * and should not need this wrapper.
 *
 * @param provider - OAuth client provider for authentication
 * @param baseUrl - Base URL for OAuth server discovery (defaults to request URL domain)
 * @returns A fetch middleware function
 */
export const withOAuth = (provider, baseUrl) => next => {
    return async (input, init) => {
        const makeRequest = async () => {
            const headers = new Headers(init?.headers);
            // Add authorization header if tokens are available
            const tokens = await provider.tokens();
            if (tokens) {
                headers.set('Authorization', `Bearer ${tokens.access_token}`);
            }
            return await next(input, { ...init, headers });
        };
        let response = await makeRequest();
        // Handle 401 responses by attempting re-authentication
        if (response.status === 401) {
            try {
                const { resourceMetadataUrl, scope } = extractWWWAuthenticateParams(response);
                // Use provided baseUrl or extract from request URL
                const serverUrl = baseUrl || (typeof input === 'string' ? new URL(input).origin : input.origin);
                const result = await auth(provider, {
                    serverUrl,
                    resourceMetadataUrl,
                    scope,
                    fetchFn: next
                });
                if (result === 'REDIRECT') {
                    throw new UnauthorizedError('Authentication requires user authorization - redirect initiated');
                }
                if (result !== 'AUTHORIZED') {
                    throw new UnauthorizedError(`Authentication failed with result: ${result}`);
                }
                // Retry the request with fresh tokens
                response = await makeRequest();
            }
            catch (error) {
                if (error instanceof UnauthorizedError) {
                    throw error;
                }
                throw new UnauthorizedError(`Failed to re-authenticate: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        // If we still have a 401 after re-auth attempt, throw an error
        if (response.status === 401) {
            const url = typeof input === 'string' ? input : input.toString();
            throw new UnauthorizedError(`Authentication failed for ${url}`);
        }
        return response;
    };
};
/**
 * Creates a fetch middleware that logs HTTP requests and responses.
 *
 * When called without arguments `withLogging()`, it uses the default logger that:
 * - Logs successful requests (2xx) to `console.log`
 * - Logs error responses (4xx/5xx) and network errors to `console.error`
 * - Logs all requests regardless of status (statusLevel: 0)
 * - Does not include request or response headers in logs
 * - Measures and displays request duration in milliseconds
 *
 * Important: the default logger uses both `console.log` and `console.error` so it should not be used with
 * `stdio` transports and applications.
 *
 * @param options - Logging configuration options
 * @returns A fetch middleware function
 */
export const withLogging = (options = {}) => {
    const { logger, includeRequestHeaders = false, includeResponseHeaders = false, statusLevel = 0 } = options;
    const defaultLogger = input => {
        const { method, url, status, statusText, duration, requestHeaders, responseHeaders, error } = input;
        let message = error
            ? `HTTP ${method} ${url} failed: ${error.message} (${duration}ms)`
            : `HTTP ${method} ${url} ${status} ${statusText} (${duration}ms)`;
        // Add headers to message if requested
        if (includeRequestHeaders && requestHeaders) {
            const reqHeaders = Array.from(requestHeaders.entries())
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ');
            message += `\n  Request Headers: {${reqHeaders}}`;
        }
        if (includeResponseHeaders && responseHeaders) {
            const resHeaders = Array.from(responseHeaders.entries())
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ');
            message += `\n  Response Headers: {${resHeaders}}`;
        }
        if (error || status >= 400) {
            // eslint-disable-next-line no-console
            console.error(message);
        }
        else {
            // eslint-disable-next-line no-console
            console.log(message);
        }
    };
    const logFn = logger || defaultLogger;
    return next => async (input, init) => {
        const startTime = performance.now();
        const method = init?.method || 'GET';
        const url = typeof input === 'string' ? input : input.toString();
        const requestHeaders = includeRequestHeaders ? new Headers(init?.headers) : undefined;
        try {
            const response = await next(input, init);
            const duration = performance.now() - startTime;
            // Only log if status meets the log level threshold
            if (response.status >= statusLevel) {
                logFn({
                    method,
                    url,
                    status: response.status,
                    statusText: response.statusText,
                    duration,
                    requestHeaders,
                    responseHeaders: includeResponseHeaders ? response.headers : undefined
                });
            }
            return response;
        }
        catch (error) {
            const duration = performance.now() - startTime;
            // Always log errors regardless of log level
            logFn({
                method,
                url,
                status: 0,
                statusText: 'Network Error',
                duration,
                requestHeaders,
                error: error
            });
            throw error;
        }
    };
};
/**
 * Composes multiple fetch middleware functions into a single middleware pipeline.
 * Middleware are applied in the order they appear, creating a chain of handlers.
 *
 * @example
 * ```typescript
 * // Create a middleware pipeline that handles both OAuth and logging
 * const enhancedFetch = applyMiddlewares(
 *   withOAuth(oauthProvider, 'https://api.example.com'),
 *   withLogging({ statusLevel: 400 })
 * )(fetch);
 *
 * // Use the enhanced fetch - it will handle auth and log errors
 * const response = await enhancedFetch('https://api.example.com/data');
 * ```
 *
 * @param middleware - Array of fetch middleware to compose into a pipeline
 * @returns A single composed middleware function
 */
export const applyMiddlewares = (...middleware) => {
    return next => {
        return middleware.reduce((handler, mw) => mw(handler), next);
    };
};
/**
 * Helper function to create custom fetch middleware with cleaner syntax.
 * Provides the next handler and request details as separate parameters for easier access.
 *
 * @example
 * ```typescript
 * // Create custom authentication middleware
 * const customAuthMiddleware = createMiddleware(async (next, input, init) => {
 *   const headers = new Headers(init?.headers);
 *   headers.set('X-Custom-Auth', 'my-token');
 *
 *   const response = await next(input, { ...init, headers });
 *
 *   if (response.status === 401) {
 *     console.log('Authentication failed');
 *   }
 *
 *   return response;
 * });
 *
 * // Create conditional middleware
 * const conditionalMiddleware = createMiddleware(async (next, input, init) => {
 *   const url = typeof input === 'string' ? input : input.toString();
 *
 *   // Only add headers for API routes
 *   if (url.includes('/api/')) {
 *     const headers = new Headers(init?.headers);
 *     headers.set('X-API-Version', 'v2');
 *     return next(input, { ...init, headers });
 *   }
 *
 *   // Pass through for non-API routes
 *   return next(input, init);
 * });
 *
 * // Create caching middleware
 * const cacheMiddleware = createMiddleware(async (next, input, init) => {
 *   const cacheKey = typeof input === 'string' ? input : input.toString();
 *
 *   // Check cache first
 *   const cached = await getFromCache(cacheKey);
 *   if (cached) {
 *     return new Response(cached, { status: 200 });
 *   }
 *
 *   // Make request and cache result
 *   const response = await next(input, init);
 *   if (response.ok) {
 *     await saveToCache(cacheKey, await response.clone().text());
 *   }
 *
 *   return response;
 * });
 * ```
 *
 * @param handler - Function that receives the next handler and request parameters
 * @returns A fetch middleware function
 */
export const createMiddleware = (handler) => {
    return next => (input, init) => handler(next, input, init);
};
//# sourceMappingURL=middleware.js.map