"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProtocol = exports.hasHostBinding = exports.getContainerPort = void 0;
const portWithProtocolRegex = RegExp(/^(\d+)(?:\/(udp|tcp))?$/i);
const getContainerPort = (port) => {
    if (typeof port === "number") {
        return port;
    }
    else if (typeof port === "string") {
        const match = portWithProtocolRegex.exec(port);
        if (match) {
            return parseInt(match[1], 10);
        }
        throw new Error(`Invalid port format: ${port}`);
    }
    else {
        return port.container;
    }
};
exports.getContainerPort = getContainerPort;
const hasHostBinding = (port) => {
    return typeof port === "object" && port.host !== undefined;
};
exports.hasHostBinding = hasHostBinding;
const getProtocol = (port) => {
    if (typeof port === "number") {
        return "tcp";
    }
    else if (typeof port === "string") {
        const match = portWithProtocolRegex.exec(port);
        if (match?.[2]) {
            return match[2].toLowerCase();
        }
        return "tcp";
    }
    else {
        return port.protocol ? port.protocol.toLowerCase() : "tcp";
    }
};
exports.getProtocol = getProtocol;
//# sourceMappingURL=port.js.map