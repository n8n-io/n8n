"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
const debug = (0, utils_1.Debug)("AbstractConnector");
class AbstractConnector {
    constructor(disconnectTimeout) {
        this.connecting = false;
        this.disconnectTimeout = disconnectTimeout;
    }
    check(info) {
        return true;
    }
    disconnect() {
        this.connecting = false;
        if (this.stream) {
            const stream = this.stream; // Make sure callbacks refer to the same instance
            const timeout = setTimeout(() => {
                debug("stream %s:%s still open, destroying it", stream.remoteAddress, stream.remotePort);
                stream.destroy();
            }, this.disconnectTimeout);
            stream.on("close", () => clearTimeout(timeout));
            stream.end();
        }
    }
}
exports.default = AbstractConnector;
