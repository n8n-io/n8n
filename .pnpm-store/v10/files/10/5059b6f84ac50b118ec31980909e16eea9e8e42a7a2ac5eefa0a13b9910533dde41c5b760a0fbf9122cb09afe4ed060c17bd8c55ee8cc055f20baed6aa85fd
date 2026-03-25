import { Express } from 'express';
/**
 * Options for creating an MCP Express application.
 */
export interface CreateMcpExpressAppOptions {
    /**
     * The hostname to bind to. Defaults to '127.0.0.1'.
     * When set to '127.0.0.1', 'localhost', or '::1', DNS rebinding protection is automatically enabled.
     */
    host?: string;
    /**
     * List of allowed hostnames for DNS rebinding protection.
     * If provided, host header validation will be applied using this list.
     * For IPv6, provide addresses with brackets (e.g., '[::1]').
     *
     * This is useful when binding to '0.0.0.0' or '::' but still wanting
     * to restrict which hostnames are allowed.
     */
    allowedHosts?: string[];
}
/**
 * Creates an Express application pre-configured for MCP servers.
 *
 * When the host is '127.0.0.1', 'localhost', or '::1' (the default is '127.0.0.1'),
 * DNS rebinding protection middleware is automatically applied to protect against
 * DNS rebinding attacks on localhost servers.
 *
 * @param options - Configuration options
 * @returns A configured Express application
 *
 * @example
 * ```typescript
 * // Basic usage - defaults to 127.0.0.1 with DNS rebinding protection
 * const app = createMcpExpressApp();
 *
 * // Custom host - DNS rebinding protection only applied for localhost hosts
 * const app = createMcpExpressApp({ host: '0.0.0.0' }); // No automatic DNS rebinding protection
 * const app = createMcpExpressApp({ host: 'localhost' }); // DNS rebinding protection enabled
 *
 * // Custom allowed hosts for non-localhost binding
 * const app = createMcpExpressApp({ host: '0.0.0.0', allowedHosts: ['myapp.local', 'localhost'] });
 * ```
 */
export declare function createMcpExpressApp(options?: CreateMcpExpressAppOptions): Express;
//# sourceMappingURL=express.d.ts.map