import { OAuthClientProvider } from './auth.js';
import { FetchLike } from '../shared/transport.js';
/**
 * Middleware function that wraps and enhances fetch functionality.
 * Takes a fetch handler and returns an enhanced fetch handler.
 */
export type Middleware = (next: FetchLike) => FetchLike;
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
export declare const withOAuth: (provider: OAuthClientProvider, baseUrl?: string | URL) => Middleware;
/**
 * Logger function type for HTTP requests
 */
export type RequestLogger = (input: {
    method: string;
    url: string | URL;
    status: number;
    statusText: string;
    duration: number;
    requestHeaders?: Headers;
    responseHeaders?: Headers;
    error?: Error;
}) => void;
/**
 * Configuration options for the logging middleware
 */
export type LoggingOptions = {
    /**
     * Custom logger function, defaults to console logging
     */
    logger?: RequestLogger;
    /**
     * Whether to include request headers in logs
     * @default false
     */
    includeRequestHeaders?: boolean;
    /**
     * Whether to include response headers in logs
     * @default false
     */
    includeResponseHeaders?: boolean;
    /**
     * Status level filter - only log requests with status >= this value
     * Set to 0 to log all requests, 400 to log only errors
     * @default 0
     */
    statusLevel?: number;
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
export declare const withLogging: (options?: LoggingOptions) => Middleware;
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
export declare const applyMiddlewares: (...middleware: Middleware[]) => Middleware;
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
export declare const createMiddleware: (handler: (next: FetchLike, input: string | URL, init?: RequestInit) => Promise<Response>) => Middleware;
//# sourceMappingURL=middleware.d.ts.map