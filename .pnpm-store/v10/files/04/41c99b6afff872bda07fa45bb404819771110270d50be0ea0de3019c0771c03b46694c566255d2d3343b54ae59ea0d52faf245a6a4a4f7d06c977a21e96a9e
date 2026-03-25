/**
 * Express middleware for DNS rebinding protection.
 * Validates Host header hostname (port-agnostic) against an allowed list.
 *
 * This is particularly important for servers without authorization or HTTPS,
 * such as localhost servers or development servers. DNS rebinding attacks can
 * bypass same-origin policy by manipulating DNS to point a domain to a
 * localhost address, allowing malicious websites to access your local server.
 *
 * @param allowedHostnames - List of allowed hostnames (without ports).
 *   For IPv6, provide the address with brackets (e.g., '[::1]').
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * const middleware = hostHeaderValidation(['localhost', '127.0.0.1', '[::1]']);
 * app.use(middleware);
 * ```
 */
export function hostHeaderValidation(allowedHostnames) {
    return (req, res, next) => {
        const hostHeader = req.headers.host;
        if (!hostHeader) {
            res.status(403).json({
                jsonrpc: '2.0',
                error: {
                    code: -32000,
                    message: 'Missing Host header'
                },
                id: null
            });
            return;
        }
        // Use URL API to parse hostname (handles IPv4, IPv6, and regular hostnames)
        let hostname;
        try {
            hostname = new URL(`http://${hostHeader}`).hostname;
        }
        catch {
            res.status(403).json({
                jsonrpc: '2.0',
                error: {
                    code: -32000,
                    message: `Invalid Host header: ${hostHeader}`
                },
                id: null
            });
            return;
        }
        if (!allowedHostnames.includes(hostname)) {
            res.status(403).json({
                jsonrpc: '2.0',
                error: {
                    code: -32000,
                    message: `Invalid Host: ${hostname}`
                },
                id: null
            });
            return;
        }
        next();
    };
}
/**
 * Convenience middleware for localhost DNS rebinding protection.
 * Allows only localhost, 127.0.0.1, and [::1] (IPv6 localhost) hostnames.
 *
 * @example
 * ```typescript
 * app.use(localhostHostValidation());
 * ```
 */
export function localhostHostValidation() {
    return hostHeaderValidation(['localhost', '127.0.0.1', '[::1]']);
}
//# sourceMappingURL=hostHeaderValidation.js.map