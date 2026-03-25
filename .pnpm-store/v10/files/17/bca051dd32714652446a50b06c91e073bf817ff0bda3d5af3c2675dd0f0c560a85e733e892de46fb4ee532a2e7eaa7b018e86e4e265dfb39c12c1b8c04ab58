"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.debugProxyErrorsPlugin = void 0;
const debug_1 = require("../../debug");
const debug = debug_1.Debug.extend('debug-proxy-errors-plugin');
/**
 * Subscribe to {@link https://www.npmjs.com/package/http-proxy#listening-for-proxy-events http-proxy error events} to prevent server from crashing.
 * Errors are logged with {@link https://www.npmjs.com/package/debug debug} library.
 */
const debugProxyErrorsPlugin = (proxyServer) => {
    /**
     * http-proxy doesn't handle any errors by default (https://github.com/http-party/node-http-proxy#listening-for-proxy-events)
     * Prevent server from crashing when http-proxy errors (uncaught errors)
     */
    proxyServer.on('error', (error, req, res, target) => {
        debug(`http-proxy error event: \n%O`, error);
    });
    proxyServer.on('proxyReq', (proxyReq, req, socket) => {
        socket.on('error', (error) => {
            debug('Socket error in proxyReq event: \n%O', error);
        });
    });
    /**
     * Fix SSE close events
     * @link https://github.com/chimurai/http-proxy-middleware/issues/678
     * @link https://github.com/http-party/node-http-proxy/issues/1520#issue-877626125
     */
    proxyServer.on('proxyRes', (proxyRes, req, res) => {
        res.on('close', () => {
            if (!res.writableEnded) {
                debug('Destroying proxyRes in proxyRes close event');
                proxyRes.destroy();
            }
        });
    });
    /**
     * Fix crash when target server restarts
     * https://github.com/chimurai/http-proxy-middleware/issues/476#issuecomment-746329030
     * https://github.com/webpack/webpack-dev-server/issues/1642#issuecomment-790602225
     */
    proxyServer.on('proxyReqWs', (proxyReq, req, socket) => {
        socket.on('error', (error) => {
            debug('Socket error in proxyReqWs event: \n%O', error);
        });
    });
    proxyServer.on('open', (proxySocket) => {
        proxySocket.on('error', (error) => {
            debug('Socket error in open event: \n%O', error);
        });
    });
    proxyServer.on('close', (req, socket, head) => {
        socket.on('error', (error) => {
            debug('Socket error in close event: \n%O', error);
        });
    });
    // https://github.com/webpack/webpack-dev-server/issues/1642#issuecomment-1103136590
    proxyServer.on('econnreset', (error, req, res, target) => {
        debug(`http-proxy econnreset event: \n%O`, error);
    });
};
exports.debugProxyErrorsPlugin = debugProxyErrorsPlugin;
