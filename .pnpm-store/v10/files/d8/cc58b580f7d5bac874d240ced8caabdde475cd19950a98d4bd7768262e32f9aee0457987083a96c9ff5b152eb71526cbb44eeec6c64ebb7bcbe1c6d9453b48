"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const events_1 = require("events");
const promisify_1 = __importDefault(require("./promisify"));
function isAgentBase(v) {
    return Boolean(v) && typeof v.addRequest === 'function';
}
function isHttpAgent(v) {
    return Boolean(v) && typeof v.addRequest === 'function';
}
function isSecureEndpoint() {
    const { stack } = new Error();
    if (typeof stack !== 'string')
        return false;
    return stack.split('\n').some(l => l.indexOf('(https.js:') !== -1);
}
function createAgent(callback, opts) {
    return new createAgent.Agent(callback, opts);
}
(function (createAgent) {
    /**
     * Base `http.Agent` implementation.
     * No pooling/keep-alive is implemented by default.
     *
     * @param {Function} callback
     * @api public
     */
    class Agent extends events_1.EventEmitter {
        constructor(callback, _opts) {
            super();
            // The callback gets promisified lazily
            this.promisifiedCallback = undefined;
            let opts = _opts;
            if (typeof callback === 'function') {
                this.callback = callback;
            }
            else if (callback) {
                opts = callback;
            }
            // timeout for the socket to be returned from the callback
            this.timeout = null;
            if (opts && typeof opts.timeout === 'number') {
                this.timeout = opts.timeout;
            }
            this.options = opts || {};
            this.maxFreeSockets = 1;
            this.maxSockets = 1;
            this.sockets = [];
            this.requests = [];
        }
        get defaultPort() {
            if (typeof this.explicitDefaultPort === 'number') {
                return this.explicitDefaultPort;
            }
            else {
                return isSecureEndpoint() ? 443 : 80;
            }
        }
        set defaultPort(v) {
            this.explicitDefaultPort = v;
        }
        get protocol() {
            if (typeof this.explicitProtocol === 'string') {
                return this.explicitProtocol;
            }
            else {
                return isSecureEndpoint() ? 'https:' : 'http:';
            }
        }
        set protocol(v) {
            this.explicitProtocol = v;
        }
        callback(req, opts, fn) {
            throw new Error('"agent-base" has no default implementation, you must subclass and override `callback()`');
        }
        /**
         * Called by node-core's "_http_client.js" module when creating
         * a new HTTP request with this Agent instance.
         *
         * @api public
         */
        addRequest(req, _opts) {
            const ownOpts = Object.assign({}, _opts);
            if (typeof ownOpts.secureEndpoint !== 'boolean') {
                ownOpts.secureEndpoint = isSecureEndpoint();
            }
            // Set default `host` for HTTP to localhost
            if (ownOpts.host == null) {
                ownOpts.host = 'localhost';
            }
            // Set default `port` for HTTP if none was explicitly specified
            if (ownOpts.port == null) {
                ownOpts.port = ownOpts.secureEndpoint ? 443 : 80;
            }
            const opts = Object.assign(Object.assign({}, this.options), ownOpts);
            if (opts.host && opts.path) {
                // If both a `host` and `path` are specified then it's most likely the
                // result of a `url.parse()` call... we need to remove the `path` portion so
                // that `net.connect()` doesn't attempt to open that as a unix socket file.
                delete opts.path;
            }
            delete opts.agent;
            delete opts.hostname;
            delete opts._defaultAgent;
            delete opts.defaultPort;
            delete opts.createConnection;
            // Hint to use "Connection: close"
            // XXX: non-documented `http` module API :(
            req._last = true;
            req.shouldKeepAlive = false;
            // Create the `stream.Duplex` instance
            let timedOut = false;
            let timeout = null;
            const timeoutMs = this.timeout;
            const freeSocket = this.freeSocket;
            function onerror(err) {
                if (req._hadError)
                    return;
                req.emit('error', err);
                // For Safety. Some additional errors might fire later on
                // and we need to make sure we don't double-fire the error event.
                req._hadError = true;
            }
            function ontimeout() {
                timeout = null;
                timedOut = true;
                const err = new Error(`A "socket" was not created for HTTP request before ${timeoutMs}ms`);
                err.code = 'ETIMEOUT';
                onerror(err);
            }
            function callbackError(err) {
                if (timedOut)
                    return;
                if (timeout !== null) {
                    clearTimeout(timeout);
                    timeout = null;
                }
                onerror(err);
            }
            function onsocket(socket) {
                let sock;
                function onfree() {
                    freeSocket(sock, opts);
                }
                if (timedOut)
                    return;
                if (timeout != null) {
                    clearTimeout(timeout);
                    timeout = null;
                }
                if (isAgentBase(socket) || isHttpAgent(socket)) {
                    // `socket` is actually an `http.Agent` instance, so
                    // relinquish responsibility for this `req` to the Agent
                    // from here on
                    socket.addRequest(req, opts);
                    return;
                }
                if (socket) {
                    sock = socket;
                    sock.on('free', onfree);
                    req.onSocket(sock);
                    return;
                }
                const err = new Error(`no Duplex stream was returned to agent-base for \`${req.method} ${req.path}\``);
                onerror(err);
            }
            if (typeof this.callback !== 'function') {
                onerror(new Error('`callback` is not defined'));
                return;
            }
            if (!this.promisifiedCallback) {
                if (this.callback.length >= 3) {
                    // Legacy callback function - convert to a Promise
                    this.promisifiedCallback = promisify_1.default(this.callback);
                }
                else {
                    this.promisifiedCallback = this.callback;
                }
            }
            if (typeof timeoutMs === 'number' && timeoutMs > 0) {
                timeout = setTimeout(ontimeout, timeoutMs);
            }
            if ('port' in opts && typeof opts.port !== 'number') {
                opts.port = Number(opts.port);
            }
            try {
                Promise.resolve(this.promisifiedCallback(req, opts)).then(onsocket, callbackError);
            }
            catch (err) {
                Promise.reject(err).catch(callbackError);
            }
        }
        freeSocket(socket, opts) {
            // TODO reuse sockets
            socket.destroy();
        }
        destroy() { }
    }
    createAgent.Agent = Agent;
})(createAgent || (createAgent = {}));
// So that `instanceof` works correctly
createAgent.prototype = createAgent.Agent.prototype;
module.exports = createAgent;
//# sourceMappingURL=index.js.map