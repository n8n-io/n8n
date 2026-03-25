"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tls_1 = __importDefault(require("tls"));
const net_1 = __importDefault(require("net"));
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('mqttjs:tls');
const buildStream = (client, opts) => {
    opts.port = opts.port || 8883;
    opts.host = opts.hostname || opts.host || 'localhost';
    if (net_1.default.isIP(opts.host) === 0) {
        opts.servername = opts.host;
    }
    opts.rejectUnauthorized = opts.rejectUnauthorized !== false;
    delete opts.path;
    debug('port %d host %s rejectUnauthorized %b', opts.port, opts.host, opts.rejectUnauthorized);
    const connection = tls_1.default.connect(opts);
    connection.on('secureConnect', () => {
        if (opts.rejectUnauthorized && !connection.authorized) {
            connection.emit('error', new Error('TLS not authorized'));
        }
        else {
            connection.removeListener('error', handleTLSerrors);
        }
    });
    function handleTLSerrors(err) {
        if (opts.rejectUnauthorized) {
            client.emit('error', err);
        }
        connection.end();
    }
    connection.on('error', handleTLSerrors);
    return connection;
};
exports.default = buildStream;
//# sourceMappingURL=tls.js.map