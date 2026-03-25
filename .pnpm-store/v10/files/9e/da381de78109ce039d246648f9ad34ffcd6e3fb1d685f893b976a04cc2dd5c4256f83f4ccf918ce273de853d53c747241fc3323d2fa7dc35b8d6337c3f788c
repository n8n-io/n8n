"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocksProxyAgent = void 0;
const socks_1 = require("socks");
const agent_base_1 = require("agent-base");
const debug_1 = __importDefault(require("debug"));
const dns_1 = __importDefault(require("dns"));
const tls_1 = __importDefault(require("tls"));
const debug = (0, debug_1.default)('socks-proxy-agent');
function parseSocksProxy(opts) {
    var _a;
    let port = 0;
    let lookup = false;
    let type = 5;
    const host = opts.hostname || opts.host;
    if (host == null) {
        throw new TypeError('No "hostname"');
    }
    if (typeof opts.port === 'number') {
        port = opts.port;
    }
    else if (typeof opts.port === 'string') {
        port = parseInt(opts.port, 10);
    }
    // From RFC 1928, Section 3: https://tools.ietf.org/html/rfc1928#section-3
    // "The SOCKS service is conventionally located on TCP port 1080"
    if (port == null) {
        port = 1080;
    }
    // figure out if we want socks v4 or v5, based on the "protocol" used.
    // Defaults to 5.
    if (opts.protocol != null) {
        switch (opts.protocol.replace(':', '')) {
            case 'socks4':
                lookup = true;
            // pass through
            case 'socks4a':
                type = 4;
                break;
            case 'socks5':
                lookup = true;
            // pass through
            case 'socks': // no version specified, default to 5h
            case 'socks5h':
                type = 5;
                break;
            default:
                throw new TypeError(`A "socks" protocol must be specified! Got: ${String(opts.protocol)}`);
        }
    }
    if (typeof opts.type !== 'undefined') {
        if (opts.type === 4 || opts.type === 5) {
            type = opts.type;
        }
        else {
            throw new TypeError(`"type" must be 4 or 5, got: ${String(opts.type)}`);
        }
    }
    const proxy = {
        host,
        port,
        type
    };
    let userId = (_a = opts.userId) !== null && _a !== void 0 ? _a : opts.username;
    let password = opts.password;
    if (opts.auth != null) {
        const auth = opts.auth.split(':');
        userId = auth[0];
        password = auth[1];
    }
    if (userId != null) {
        Object.defineProperty(proxy, 'userId', {
            value: userId,
            enumerable: false
        });
    }
    if (password != null) {
        Object.defineProperty(proxy, 'password', {
            value: password,
            enumerable: false
        });
    }
    return { lookup, proxy };
}
const normalizeProxyOptions = (input) => {
    let proxyOptions;
    if (typeof input === 'string') {
        proxyOptions = new URL(input);
    }
    else {
        proxyOptions = input;
    }
    if (proxyOptions == null) {
        throw new TypeError('a SOCKS proxy server `hostname` and `port` must be specified!');
    }
    return proxyOptions;
};
class SocksProxyAgent extends agent_base_1.Agent {
    constructor(input, options) {
        var _a;
        const proxyOptions = normalizeProxyOptions(input);
        super(proxyOptions);
        const parsedProxy = parseSocksProxy(proxyOptions);
        this.shouldLookup = parsedProxy.lookup;
        this.proxy = parsedProxy.proxy;
        this.tlsConnectionOptions = proxyOptions.tls != null ? proxyOptions.tls : {};
        this.timeout = (_a = options === null || options === void 0 ? void 0 : options.timeout) !== null && _a !== void 0 ? _a : null;
    }
    /**
     * Initiates a SOCKS connection to the specified SOCKS proxy server,
     * which in turn connects to the specified remote host and port.
     *
     * @api protected
     */
    callback(req, opts) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const { shouldLookup, proxy, timeout } = this;
            let { host, port, lookup: lookupCallback } = opts;
            if (host == null) {
                throw new Error('No `host` defined!');
            }
            if (shouldLookup) {
                // Client-side DNS resolution for "4" and "5" socks proxy versions.
                host = yield new Promise((resolve, reject) => {
                    // Use the request's custom lookup, if one was configured:
                    const lookupFn = lookupCallback !== null && lookupCallback !== void 0 ? lookupCallback : dns_1.default.lookup;
                    lookupFn(host, {}, (err, res) => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            resolve(res);
                        }
                    });
                });
            }
            const socksOpts = {
                proxy,
                destination: { host, port },
                command: 'connect',
                timeout: timeout !== null && timeout !== void 0 ? timeout : undefined
            };
            const cleanup = (tlsSocket) => {
                req.destroy();
                socket.destroy();
                if (tlsSocket)
                    tlsSocket.destroy();
            };
            debug('Creating socks proxy connection: %o', socksOpts);
            const { socket } = yield socks_1.SocksClient.createConnection(socksOpts);
            debug('Successfully created socks proxy connection');
            if (timeout !== null) {
                socket.setTimeout(timeout);
                socket.on('timeout', () => cleanup());
            }
            if (opts.secureEndpoint) {
                // The proxy is connecting to a TLS server, so upgrade
                // this socket connection to a TLS connection.
                debug('Upgrading socket connection to TLS');
                const servername = (_a = opts.servername) !== null && _a !== void 0 ? _a : opts.host;
                const tlsSocket = tls_1.default.connect(Object.assign(Object.assign(Object.assign({}, omit(opts, 'host', 'hostname', 'path', 'port')), { socket,
                    servername }), this.tlsConnectionOptions));
                tlsSocket.once('error', (error) => {
                    debug('socket TLS error', error.message);
                    cleanup(tlsSocket);
                });
                return tlsSocket;
            }
            return socket;
        });
    }
}
exports.SocksProxyAgent = SocksProxyAgent;
function omit(obj, ...keys) {
    const ret = {};
    let key;
    for (key in obj) {
        if (!keys.includes(key)) {
            ret[key] = obj[key];
        }
    }
    return ret;
}
//# sourceMappingURL=index.js.map