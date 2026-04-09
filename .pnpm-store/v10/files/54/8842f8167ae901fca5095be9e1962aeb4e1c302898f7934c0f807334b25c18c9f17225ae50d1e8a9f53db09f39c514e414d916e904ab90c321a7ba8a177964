"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVerboseLogs = getVerboseLogs;
function getVerboseLogs({ headerParams, path, method, host, body, statusCode, responseTime, }) {
    const verboseLogs = {
        path,
        method,
        host,
    };
    if (headerParams && Object.keys(headerParams).length > 0) {
        verboseLogs.headerParams = headerParams;
    }
    if (body && Object.keys(body).length > 0) {
        verboseLogs.body = body;
    }
    if (statusCode) {
        verboseLogs.statusCode = statusCode;
    }
    if (responseTime) {
        verboseLogs.responseTime = responseTime;
    }
    return verboseLogs;
}
//# sourceMappingURL=verbose-logs.js.map