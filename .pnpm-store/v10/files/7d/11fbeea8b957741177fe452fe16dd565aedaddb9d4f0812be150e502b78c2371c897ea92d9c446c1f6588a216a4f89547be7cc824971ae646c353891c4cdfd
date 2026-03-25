"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectAsync = void 0;
const debug_1 = __importDefault(require("debug"));
const url_1 = __importDefault(require("url"));
const client_1 = __importDefault(require("../client"));
const is_browser_1 = __importDefault(require("../is-browser"));
if (typeof (process === null || process === void 0 ? void 0 : process.nextTick) !== 'function') {
    process.nextTick = setImmediate;
}
const debug = (0, debug_1.default)('mqttjs');
const protocols = {};
if (!is_browser_1.default) {
    protocols.mqtt = require('./tcp').default;
    protocols.tcp = require('./tcp').default;
    protocols.ssl = require('./tls').default;
    protocols.tls = protocols.ssl;
    protocols.mqtts = require('./tls').default;
}
else {
    protocols.wx = require('./wx').default;
    protocols.wxs = require('./wx').default;
    protocols.ali = require('./ali').default;
    protocols.alis = require('./ali').default;
}
protocols.ws = require('./ws').default;
protocols.wss = require('./ws').default;
function parseAuthOptions(opts) {
    let matches;
    if (opts.auth) {
        matches = opts.auth.match(/^(.+):(.+)$/);
        if (matches) {
            opts.username = matches[1];
            opts.password = matches[2];
        }
        else {
            opts.username = opts.auth;
        }
    }
}
function connect(brokerUrl, opts) {
    var _a, _b, _c;
    debug('connecting to an MQTT broker...');
    if (typeof brokerUrl === 'object' && !opts) {
        opts = brokerUrl;
        brokerUrl = '';
    }
    opts = opts || {};
    if (brokerUrl && typeof brokerUrl === 'string') {
        const parsedUrl = url_1.default.parse(brokerUrl, true);
        const parsedOptions = {};
        if (parsedUrl.port != null) {
            parsedOptions.port = Number(parsedUrl.port);
        }
        parsedOptions.host = parsedUrl.hostname;
        parsedOptions.query = parsedUrl.query;
        parsedOptions.auth = parsedUrl.auth;
        parsedOptions.protocol = parsedUrl.protocol;
        parsedOptions.path = parsedUrl.path;
        parsedOptions.protocol = (_a = parsedOptions.protocol) === null || _a === void 0 ? void 0 : _a.replace(/:$/, '');
        opts = Object.assign(Object.assign({}, parsedOptions), opts);
        if (!opts.protocol) {
            throw new Error('Missing protocol');
        }
    }
    opts.unixSocket = opts.unixSocket || ((_b = opts.protocol) === null || _b === void 0 ? void 0 : _b.includes('+unix'));
    if (opts.unixSocket) {
        opts.protocol = opts.protocol.replace('+unix', '');
    }
    else if (!((_c = opts.protocol) === null || _c === void 0 ? void 0 : _c.startsWith('ws'))) {
        delete opts.path;
    }
    parseAuthOptions(opts);
    if (opts.query && typeof opts.query.clientId === 'string') {
        opts.clientId = opts.query.clientId;
    }
    if (opts.cert && opts.key) {
        if (opts.protocol) {
            if (['mqtts', 'wss', 'wxs', 'alis'].indexOf(opts.protocol) === -1) {
                switch (opts.protocol) {
                    case 'mqtt':
                        opts.protocol = 'mqtts';
                        break;
                    case 'ws':
                        opts.protocol = 'wss';
                        break;
                    case 'wx':
                        opts.protocol = 'wxs';
                        break;
                    case 'ali':
                        opts.protocol = 'alis';
                        break;
                    default:
                        throw new Error(`Unknown protocol for secure connection: "${opts.protocol}"!`);
                }
            }
        }
        else {
            throw new Error('Missing secure protocol key');
        }
    }
    if (!protocols[opts.protocol]) {
        const isSecure = ['mqtts', 'wss'].indexOf(opts.protocol) !== -1;
        opts.protocol = [
            'mqtt',
            'mqtts',
            'ws',
            'wss',
            'wx',
            'wxs',
            'ali',
            'alis',
        ].filter((key, index) => {
            if (isSecure && index % 2 === 0) {
                return false;
            }
            return typeof protocols[key] === 'function';
        })[0];
    }
    if (opts.clean === false && !opts.clientId) {
        throw new Error('Missing clientId for unclean clients');
    }
    if (opts.protocol) {
        opts.defaultProtocol = opts.protocol;
    }
    function wrapper(client) {
        if (opts.servers) {
            if (!client._reconnectCount ||
                client._reconnectCount === opts.servers.length) {
                client._reconnectCount = 0;
            }
            opts.host = opts.servers[client._reconnectCount].host;
            opts.port = opts.servers[client._reconnectCount].port;
            opts.protocol = !opts.servers[client._reconnectCount].protocol
                ? opts.defaultProtocol
                : opts.servers[client._reconnectCount].protocol;
            opts.hostname = opts.host;
            client._reconnectCount++;
        }
        debug('calling streambuilder for', opts.protocol);
        return protocols[opts.protocol](client, opts);
    }
    const client = new client_1.default(wrapper, opts);
    client.on('error', () => {
    });
    return client;
}
function connectAsync(brokerUrl, opts, allowRetries = true) {
    return new Promise((resolve, reject) => {
        const client = connect(brokerUrl, opts);
        const promiseResolutionListeners = {
            connect: (connack) => {
                removePromiseResolutionListeners();
                resolve(client);
            },
            end: () => {
                removePromiseResolutionListeners();
                resolve(client);
            },
            error: (err) => {
                removePromiseResolutionListeners();
                client.end();
                reject(err);
            },
        };
        if (allowRetries === false) {
            promiseResolutionListeners.close = () => {
                promiseResolutionListeners.error(new Error("Couldn't connect to server"));
            };
        }
        function removePromiseResolutionListeners() {
            Object.keys(promiseResolutionListeners).forEach((eventName) => {
                client.off(eventName, promiseResolutionListeners[eventName]);
            });
        }
        Object.keys(promiseResolutionListeners).forEach((eventName) => {
            client.on(eventName, promiseResolutionListeners[eventName]);
        });
    });
}
exports.connectAsync = connectAsync;
exports.default = connect;
//# sourceMappingURL=index.js.map