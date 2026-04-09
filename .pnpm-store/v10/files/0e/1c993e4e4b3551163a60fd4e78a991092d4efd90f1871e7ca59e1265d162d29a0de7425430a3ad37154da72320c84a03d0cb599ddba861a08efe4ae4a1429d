"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleRequest = handleRequest;
function handleRequest({ input, handler, harLog, isUndici = false, }) {
    if (isUndici) {
        return handleUndiciRequest(input, handler, harLog);
    }
    else {
        handleNodeRequest(input, handler, harLog);
        return handler;
    }
}
function handleUndiciRequest(options, handler, harLog) {
    const startTime = Date.now();
    const requestId = generateRequestId();
    const harEntry = {
        startedDateTime: new Date().toISOString(),
        time: -1,
        request: {
            method: options.method || 'GET',
            url: options.path || '',
            httpVersion: 'HTTP/1.1',
            cookies: [],
            headers: formatUndiciHeaders(options.headers),
            queryString: [],
            headersSize: -1,
            bodySize: -1,
        },
        response: {
            status: 0,
            statusText: '',
            httpVersion: 'HTTP/1.1',
            cookies: [],
            headers: [],
            content: {
                size: 0,
                mimeType: '',
                text: '',
            },
            redirectURL: '',
            headersSize: -1,
            bodySize: -1,
        },
        cache: {},
        timings: {
            blocked: -1,
            dns: -1,
            connect: -1,
            send: 0,
            wait: 0,
            receive: 0,
            ssl: -1,
        },
    };
    const wrappedHandler = {
        onConnect: handler.onConnect,
        onError: (error) => {
            harEntry.response.status = 0;
            harEntry.response.statusText = error.message;
            harEntry.time = Date.now() - startTime;
            if (harLog) {
                harLog.set(requestId, {
                    log: {
                        version: '1.2',
                        creator: { name: 'api-test-framework', version: '1.0' },
                        entries: [harEntry],
                    },
                });
            }
            if (handler.onError) {
                handler.onError(error);
            }
        },
        onHeaders: (statusCode, headers, resume, opaque) => {
            harEntry.response.status = statusCode;
            harEntry.response.headers = formatUndiciHeaders(headers);
            if (handler.onHeaders) {
                handler.onHeaders(statusCode, headers, resume, opaque);
            }
            return true;
        },
        onData: handler.onData,
        onComplete: (trailers) => {
            harEntry.time = Date.now() - startTime;
            if (harLog) {
                harLog.set(requestId, {
                    log: {
                        version: '1.2',
                        creator: { name: 'api-test-framework', version: '1.0' },
                        entries: [harEntry],
                    },
                });
            }
            if (handler.onComplete) {
                handler.onComplete(trailers);
            }
        },
    };
    return wrappedHandler;
}
function formatUndiciHeaders(headers) {
    if (!headers)
        return [];
    if (Array.isArray(headers)) {
        return chunks(headers, 2).map(([name, value]) => ({
            name: String(name),
            value: String(value),
        }));
    }
    return [];
}
function chunks(arr, size) {
    return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));
}
function generateRequestId() {
    return Math.random().toString(36).substring(2, 15);
}
function handleNodeRequest(request, handler, harLog) {
    const requestId = generateRequestId();
    const harEntry = {
        startedDateTime: new Date().toISOString(),
        time: 0,
        request: {
            method: request.method || 'GET',
            url: request.url,
            httpVersion: 'HTTP/1.1',
            cookies: [],
            headers: formatUndiciHeaders(request.headers),
            queryString: [],
            headersSize: -1,
            bodySize: -1,
        },
        response: {
            status: 0,
            statusText: '',
            httpVersion: 'HTTP/1.1',
            cookies: [],
            headers: [],
            content: {
                size: 0,
                mimeType: '',
                text: '',
            },
            redirectURL: '',
            headersSize: -1,
            bodySize: -1,
        },
        cache: {},
        timings: {
            blocked: -1,
            dns: -1,
            connect: -1,
            send: -1,
            wait: -1,
            receive: -1,
            ssl: -1,
        },
    };
    // Add HAR tracking header
    if (request.headers instanceof Headers) {
        request.headers.set('x-har-request-id', requestId);
    }
    else if (typeof request.headers === 'object' && request.headers !== null) {
        request.headers['x-har-request-id'] = requestId;
    }
    // Register all required event handlers
    handler.on('response', (response) => {
        harEntry.response.status = response.statusCode;
        harEntry.response.statusText = response.statusMessage;
        harEntry.response.headers = formatUndiciHeaders(response.headers);
    });
    handler.on('data', (chunk) => {
        // Handle response data chunks
        harEntry.response.content.text = (harEntry.response.content.text || '') + chunk.toString();
        harEntry.response.content.size += chunk.length;
    });
    handler.on('end', () => {
        if (harLog) {
            harLog.set(requestId, {
                log: {
                    version: '1.2',
                    creator: { name: 'api-test-framework', version: '1.0' },
                    entries: [harEntry],
                },
            });
        }
    });
    handler.on('error', (error) => {
        harEntry.response.status = 0;
        harEntry.response.statusText = error.message;
        if (harLog) {
            harLog.set(requestId, {
                log: {
                    version: '1.2',
                    creator: { name: 'api-test-framework', version: '1.0' },
                    entries: [harEntry],
                },
            });
        }
    });
}
//# sourceMappingURL=handle-request.js.map