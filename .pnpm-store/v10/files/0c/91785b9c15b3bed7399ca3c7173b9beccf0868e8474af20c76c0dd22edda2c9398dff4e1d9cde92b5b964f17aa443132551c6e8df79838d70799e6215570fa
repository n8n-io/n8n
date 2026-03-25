"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPort = getPort;
/**
 * Get port from target
 * Using proxyRes.req.agent.sockets to determine the target port
 */
function getPort(sockets) {
    return Object.keys(sockets || {})?.[0]?.split(':')[1];
}
