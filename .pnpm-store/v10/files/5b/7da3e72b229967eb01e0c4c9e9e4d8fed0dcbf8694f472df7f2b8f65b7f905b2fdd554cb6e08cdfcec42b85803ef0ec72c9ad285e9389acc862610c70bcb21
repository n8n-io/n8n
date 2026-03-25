"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.proxyEventsPlugin = void 0;
const debug_1 = require("../../debug");
const function_1 = require("../../utils/function");
const debug = debug_1.Debug.extend('proxy-events-plugin');
/**
 * Implements option.on object to subscribe to http-proxy events.
 *
 * @example
 * ```js
 * createProxyMiddleware({
 *  on: {
 *    error: (error, req, res, target) => {},
 *    proxyReq: (proxyReq, req, res, options) => {},
 *    proxyReqWs: (proxyReq, req, socket, options) => {},
 *    proxyRes: (proxyRes, req, res) => {},
 *    open: (proxySocket) => {},
 *    close: (proxyRes, proxySocket, proxyHead) => {},
 *    start: (req, res, target) => {},
 *    end: (req, res, proxyRes) => {},
 *    econnreset: (error, req, res, target) => {},
 *  }
 * });
 * ```
 */
const proxyEventsPlugin = (proxyServer, options) => {
    Object.entries(options.on || {}).forEach(([eventName, handler]) => {
        debug(`register event handler: "${eventName}" -> "${(0, function_1.getFunctionName)(handler)}"`);
        proxyServer.on(eventName, handler);
    });
};
exports.proxyEventsPlugin = proxyEventsPlugin;
