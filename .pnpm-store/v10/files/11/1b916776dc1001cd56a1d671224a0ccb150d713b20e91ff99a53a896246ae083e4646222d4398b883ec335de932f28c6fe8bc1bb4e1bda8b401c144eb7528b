"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnixSocketStrategy = void 0;
const fs_1 = require("fs");
class UnixSocketStrategy {
    platform;
    constructor(platform = process.platform) {
        this.platform = platform;
    }
    getName() {
        return "UnixSocketStrategy";
    }
    async getResult() {
        if ((this.platform !== "linux" && this.platform !== "darwin") || !(0, fs_1.existsSync)("/var/run/docker.sock")) {
            return;
        }
        return {
            uri: "unix:///var/run/docker.sock",
            dockerOptions: { socketPath: "/var/run/docker.sock" },
            composeEnvironment: {},
            allowUserOverrides: true,
        };
    }
}
exports.UnixSocketStrategy = UnixSocketStrategy;
//# sourceMappingURL=unix-socket-strategy.js.map