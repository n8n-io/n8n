"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.lookupHostIps = void 0;
const promises_1 = require("dns/promises");
const net_1 = __importDefault(require("net"));
const lookupHostIps = async (host) => {
    if (net_1.default.isIP(host) === 0) {
        return await (0, promises_1.lookup)(host, { all: true });
    }
    else {
        return [{ address: host, family: net_1.default.isIP(host) }];
    }
};
exports.lookupHostIps = lookupHostIps;
//# sourceMappingURL=lookup-host-ips.js.map