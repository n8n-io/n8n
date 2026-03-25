"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorResponsePlugin = void 0;
const status_code_1 = require("../../status-code");
function isResponseLike(obj) {
    return obj && typeof obj.writeHead === 'function';
}
function isSocketLike(obj) {
    return obj && typeof obj.write === 'function' && !('writeHead' in obj);
}
const errorResponsePlugin = (proxyServer, options) => {
    proxyServer.on('error', (err, req, res, target) => {
        // Re-throw error. Not recoverable since req & res are empty.
        if (!req && !res) {
            throw err; // "Error: Must provide a proper URL as target"
        }
        if (isResponseLike(res)) {
            if (!res.headersSent) {
                const statusCode = (0, status_code_1.getStatusCode)(err.code);
                res.writeHead(statusCode);
            }
            const host = req.headers && req.headers.host;
            res.end(`Error occurred while trying to proxy: ${host}${req.url}`);
        }
        else if (isSocketLike(res)) {
            res.destroy();
        }
    });
};
exports.errorResponsePlugin = errorResponsePlugin;
