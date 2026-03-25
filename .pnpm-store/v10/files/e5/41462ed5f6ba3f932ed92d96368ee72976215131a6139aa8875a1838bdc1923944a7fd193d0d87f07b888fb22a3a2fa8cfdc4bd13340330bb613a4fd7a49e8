"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const net_1 = __importDefault(require("net"));
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('mqttjs:tcp');
const buildStream = (client, opts) => {
    opts.port = opts.port || 1883;
    opts.hostname = opts.hostname || opts.host || 'localhost';
    const { port, path } = opts;
    const host = opts.hostname;
    debug('port %d and host %s', port, host);
    return net_1.default.createConnection({ port, host, path });
};
exports.default = buildStream;
//# sourceMappingURL=tcp.js.map