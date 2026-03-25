const assert = require("assert");
const http = require("http");
const delay = require("./delay");

/**
 * @param server {http.Server}
 * @param [gracefulTerminationTimeout=1000] How long should we wait before destroying some hung sockets
 * @param [maxWaitTimeout=30000] How much time you give the HTTP server to be terminated.
 * @param [logger=console] Prints warnings if something goes non standard way.
 * @return {{terminate(): Promise<{code: string, success: boolean, message: string, [error]: Error}>}}
 */
module.exports = function HttpTerminator({
    server,
    gracefulTerminationTimeout = 1000,
    maxWaitTimeout = 30000,
    logger = console,
} = {}) {
    assert(server);

    const _sockets = new Set();
    const _secureSockets = new Set();

    let terminating;

    server.on("connection", (socket) => {
        if (terminating) {
            socket.destroy();
        } else {
            _sockets.add(socket);

            socket.once("close", () => {
                _sockets.delete(socket);
            });
        }
    });

    server.on("secureConnection", (socket) => {
        if (terminating) {
            socket.destroy();
        } else {
            _secureSockets.add(socket);

            socket.once("close", () => {
                _secureSockets.delete(socket);
            });
        }
    });

    /**
     * Evaluate whether additional steps are required to destroy the socket.
     *
     * @see https://github.com/nodejs/node/blob/57bd715d527aba8dae56b975056961b0e429e91e/lib/_http_client.js#L363-L413
     */
    function destroySocket(socket) {
        socket.destroy();

        if (socket.server instanceof http.Server) {
            _sockets.delete(socket);
        } else {
            _secureSockets.delete(socket);
        }
    }

    return {
        _secureSockets,
        _sockets,
        /**
         * Terminates the given server.
         * @return {Promise<{code: string, success: boolean, message: string, [error]: Error}>}
         */
        async terminate() {
            try {
                if (terminating) {
                    logger.warn("lil-http-terminator: already terminating HTTP server");

                    return terminating;
                }

                // This is a built-in method available starting Node 16. Can speeds up things by a few seconds.
                if (server.closeIdleConnections) server.closeIdleConnections();

                let resolveTerminating;

                terminating = Promise.race([
                    new Promise((resolve) => {
                        resolveTerminating = resolve;
                    }),
                    delay(maxWaitTimeout).then(() => ({
                        success: false,
                        code: "TIMED_OUT",
                        message: `Server didn't close in ${maxWaitTimeout} msec. Use server.closeAllConnections()`,
                    })),
                ]);

                server.on("request", (incomingMessage, outgoingMessage) => {
                    if (!outgoingMessage.headersSent) {
                        outgoingMessage.setHeader("connection", "close");
                    }
                });

                for (const socket of _sockets) {
                    // This is the HTTP CONNECT request socket.
                    if (!(socket.server instanceof http.Server)) {
                        continue;
                    }

                    const serverResponse = socket._httpMessage;

                    if (serverResponse) {
                        if (!serverResponse.headersSent) {
                            serverResponse.setHeader("connection", "close");
                        }

                        continue;
                    }

                    destroySocket(socket);
                }

                for (const socket of _secureSockets) {
                    const serverResponse = socket._httpMessage;

                    if (serverResponse) {
                        if (!serverResponse.headersSent) {
                            serverResponse.setHeader("connection", "close");
                        }

                        continue;
                    }

                    destroySocket(socket);
                }

                if (_sockets.size || _secureSockets.size) {
                    const endWaitAt = Date.now() + gracefulTerminationTimeout;
                    while ((_sockets.size || _secureSockets.size) && Date.now() < endWaitAt) await delay(1);

                    for (const socket of _sockets) {
                        destroySocket(socket);
                    }

                    for (const socket of _secureSockets) {
                        destroySocket(socket);
                    }
                }

                server.close((error) => {
                    if (error) {
                        logger.warn("lil-http-terminator: server error while closing", error);
                        resolveTerminating({ success: false, code: "SERVER_ERROR", message: error.message, error });
                    } else {
                        resolveTerminating({
                            success: true,
                            code: "TERMINATED",
                            message: "Server successfully closed",
                        });
                    }
                });

                return terminating;
            } catch (error) {
                logger.warn("lil-http-terminator: internal error", error);
                return { success: false, code: "INTERNAL_ERROR", message: error.message, error };
            }
        },
    };
};
