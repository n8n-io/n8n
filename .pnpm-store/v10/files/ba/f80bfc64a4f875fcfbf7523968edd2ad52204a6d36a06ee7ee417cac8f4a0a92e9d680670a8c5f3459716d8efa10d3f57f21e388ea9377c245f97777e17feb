"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpProxyMiddleware = void 0;
const httpProxy = require("http-proxy");
const configuration_1 = require("./configuration");
const get_plugins_1 = require("./get-plugins");
const path_filter_1 = require("./path-filter");
const PathRewriter = require("./path-rewriter");
const Router = require("./router");
const debug_1 = require("./debug");
const function_1 = require("./utils/function");
const logger_1 = require("./logger");
class HttpProxyMiddleware {
    constructor(options) {
        this.wsInternalSubscribed = false;
        this.serverOnCloseSubscribed = false;
        // https://github.com/Microsoft/TypeScript/wiki/'this'-in-TypeScript#red-flags-for-this
        this.middleware = (async (req, res, next) => {
            if (this.shouldProxy(this.proxyOptions.pathFilter, req)) {
                try {
                    const activeProxyOptions = await this.prepareProxyRequest(req);
                    (0, debug_1.Debug)(`proxy request to target: %O`, activeProxyOptions.target);
                    this.proxy.web(req, res, activeProxyOptions);
                }
                catch (err) {
                    next?.(err);
                }
            }
            else {
                next?.();
            }
            /**
             * Get the server object to subscribe to server events;
             * 'upgrade' for websocket and 'close' for graceful shutdown
             *
             * NOTE:
             * req.socket: node >= 13
             * req.connection: node < 13 (Remove this when node 12/13 support is dropped)
             */
            const server = (req.socket ?? req.connection)?.server;
            if (server && !this.serverOnCloseSubscribed) {
                server.on('close', () => {
                    (0, debug_1.Debug)('server close signal received: closing proxy server');
                    this.proxy.close();
                });
                this.serverOnCloseSubscribed = true;
            }
            if (this.proxyOptions.ws === true) {
                // use initial request to access the server object to subscribe to http upgrade event
                this.catchUpgradeRequest(server);
            }
        });
        this.catchUpgradeRequest = (server) => {
            if (!this.wsInternalSubscribed) {
                (0, debug_1.Debug)('subscribing to server upgrade event');
                server.on('upgrade', this.handleUpgrade);
                // prevent duplicate upgrade handling;
                // in case external upgrade is also configured
                this.wsInternalSubscribed = true;
            }
        };
        this.handleUpgrade = async (req, socket, head) => {
            try {
                if (this.shouldProxy(this.proxyOptions.pathFilter, req)) {
                    const activeProxyOptions = await this.prepareProxyRequest(req);
                    this.proxy.ws(req, socket, head, activeProxyOptions);
                    (0, debug_1.Debug)('server upgrade event received. Proxying WebSocket');
                }
            }
            catch (err) {
                // This error does not include the URL as the fourth argument as we won't
                // have the URL if `this.prepareProxyRequest` throws an error.
                this.proxy.emit('error', err, req, socket);
            }
        };
        /**
         * Determine whether request should be proxied.
         */
        this.shouldProxy = (pathFilter, req) => {
            try {
                return (0, path_filter_1.matchPathFilter)(pathFilter, req.url, req);
            }
            catch (err) {
                (0, debug_1.Debug)('Error: matchPathFilter() called with request url: ', `"${req.url}"`);
                this.logger.error(err);
                return false;
            }
        };
        /**
         * Apply option.router and option.pathRewrite
         * Order matters:
         *    Router uses original path for routing;
         *    NOT the modified path, after it has been rewritten by pathRewrite
         * @param {Object} req
         * @return {Object} proxy options
         */
        this.prepareProxyRequest = async (req) => {
            /**
             * Incorrect usage confirmed: https://github.com/expressjs/express/issues/4854#issuecomment-1066171160
             * Temporary restore req.url patch for {@link src/legacy/create-proxy-middleware.ts legacyCreateProxyMiddleware()}
             * FIXME: remove this patch in future release
             */
            if (this.middleware.__LEGACY_HTTP_PROXY_MIDDLEWARE__) {
                req.url = req.originalUrl || req.url;
            }
            const newProxyOptions = Object.assign({}, this.proxyOptions);
            // Apply in order:
            // 1. option.router
            // 2. option.pathRewrite
            await this.applyRouter(req, newProxyOptions);
            await this.applyPathRewrite(req, this.pathRewriter);
            return newProxyOptions;
        };
        // Modify option.target when router present.
        this.applyRouter = async (req, options) => {
            let newTarget;
            if (options.router) {
                newTarget = await Router.getTarget(req, options);
                if (newTarget) {
                    (0, debug_1.Debug)('router new target: "%s"', newTarget);
                    options.target = newTarget;
                }
            }
        };
        // rewrite path
        this.applyPathRewrite = async (req, pathRewriter) => {
            if (pathRewriter) {
                const path = await pathRewriter(req.url, req);
                if (typeof path === 'string') {
                    (0, debug_1.Debug)('pathRewrite new path: %s', req.url);
                    req.url = path;
                }
                else {
                    (0, debug_1.Debug)('pathRewrite: no rewritten path found: %s', req.url);
                }
            }
        };
        (0, configuration_1.verifyConfig)(options);
        this.proxyOptions = options;
        this.logger = (0, logger_1.getLogger)(options);
        (0, debug_1.Debug)(`create proxy server`);
        this.proxy = httpProxy.createProxyServer({});
        this.registerPlugins(this.proxy, this.proxyOptions);
        this.pathRewriter = PathRewriter.createPathRewriter(this.proxyOptions.pathRewrite); // returns undefined when "pathRewrite" is not provided
        // https://github.com/chimurai/http-proxy-middleware/issues/19
        // expose function to upgrade externally
        this.middleware.upgrade = (req, socket, head) => {
            if (!this.wsInternalSubscribed) {
                this.handleUpgrade(req, socket, head);
            }
        };
    }
    registerPlugins(proxy, options) {
        const plugins = (0, get_plugins_1.getPlugins)(options);
        plugins.forEach((plugin) => {
            (0, debug_1.Debug)(`register plugin: "${(0, function_1.getFunctionName)(plugin)}"`);
            plugin(proxy, options);
        });
    }
}
exports.HttpProxyMiddleware = HttpProxyMiddleware;
