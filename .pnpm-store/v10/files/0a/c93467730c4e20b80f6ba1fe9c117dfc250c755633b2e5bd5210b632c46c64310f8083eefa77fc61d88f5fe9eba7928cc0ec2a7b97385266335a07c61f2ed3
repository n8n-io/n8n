"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loggerPlugin = void 0;
const url_1 = require("url");
const logger_1 = require("../../logger");
const logger_plugin_1 = require("../../utils/logger-plugin");
const loggerPlugin = (proxyServer, options) => {
    const logger = (0, logger_1.getLogger)(options);
    proxyServer.on('error', (err, req, res, target) => {
        const hostname = req?.headers?.host;
        const requestHref = `${hostname}${req?.url}`;
        const targetHref = `${target?.href}`; // target is undefined when websocket errors
        const errorMessage = '[HPM] Error occurred while proxying request %s to %s [%s] (%s)';
        const errReference = 'https://nodejs.org/api/errors.html#errors_common_system_errors'; // link to Node Common Systems Errors page
        logger.error(errorMessage, requestHref, targetHref, err.code || err, errReference);
    });
    /**
     * Log request and response
     * @example
     * ```shell
     * [HPM] GET /users/ -> http://jsonplaceholder.typicode.com/users/ [304]
     * ```
     */
    proxyServer.on('proxyRes', (proxyRes, req, res) => {
        // BrowserSync uses req.originalUrl
        // Next.js doesn't have req.baseUrl
        const originalUrl = req.originalUrl ?? `${req.baseUrl || ''}${req.url}`;
        // construct targetUrl
        let target;
        try {
            const port = (0, logger_plugin_1.getPort)(proxyRes.req?.agent?.sockets);
            const obj = {
                protocol: proxyRes.req.protocol,
                host: proxyRes.req.host,
                pathname: proxyRes.req.path,
            };
            target = new url_1.URL(`${obj.protocol}//${obj.host}${obj.pathname}`);
            if (port) {
                target.port = port;
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        }
        catch (err) {
            // nock issue (https://github.com/chimurai/http-proxy-middleware/issues/1035)
            // fallback to old implementation (less correct - without port)
            target = new url_1.URL(options.target);
            target.pathname = proxyRes.req.path;
        }
        const targetUrl = target.toString();
        const exchange = `[HPM] ${req.method} ${originalUrl} -> ${targetUrl} [${proxyRes.statusCode}]`;
        logger.info(exchange);
    });
    /**
     * When client opens WebSocket connection
     */
    proxyServer.on('open', (socket) => {
        logger.info('[HPM] Client connected: %o', socket.address());
    });
    /**
     * When client closes WebSocket connection
     */
    proxyServer.on('close', (req, proxySocket, proxyHead) => {
        logger.info('[HPM] Client disconnected: %o', proxySocket.address());
    });
};
exports.loggerPlugin = loggerPlugin;
