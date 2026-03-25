import express from 'express';
import { hostHeaderValidation, localhostHostValidation } from './middleware/hostHeaderValidation.js';
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
export function createMcpExpressApp(options = {}) {
    const { host = '127.0.0.1', allowedHosts } = options;
    const app = express();
    app.use(express.json());
    // If allowedHosts is explicitly provided, use that for validation
    if (allowedHosts) {
        app.use(hostHeaderValidation(allowedHosts));
    }
    else {
        // Apply DNS rebinding protection automatically for localhost hosts
        const localhostHosts = ['127.0.0.1', 'localhost', '::1'];
        if (localhostHosts.includes(host)) {
            app.use(localhostHostValidation());
        }
        else if (host === '0.0.0.0' || host === '::') {
            // Warn when binding to all interfaces without DNS rebinding protection
            // eslint-disable-next-line no-console
            console.warn(`Warning: Server is binding to ${host} without DNS rebinding protection. ` +
                'Consider using the allowedHosts option to restrict allowed hosts, ' +
                'or use authentication to protect your server.');
        }
    }
    return app;
}
//# sourceMappingURL=express.js.map