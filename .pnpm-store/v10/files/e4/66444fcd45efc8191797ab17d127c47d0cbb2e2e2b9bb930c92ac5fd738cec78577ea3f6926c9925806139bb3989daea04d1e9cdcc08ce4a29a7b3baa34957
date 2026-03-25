"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NpipeSocketStrategy = void 0;
class NpipeSocketStrategy {
    platform;
    constructor(platform = process.platform) {
        this.platform = platform;
    }
    getName() {
        return "NpipeSocketStrategy";
    }
    async getResult() {
        if (this.platform !== "win32") {
            return;
        }
        return {
            uri: "npipe:////./pipe/docker_engine",
            dockerOptions: { socketPath: "//./pipe/docker_engine" },
            composeEnvironment: {},
            allowUserOverrides: true,
        };
    }
}
exports.NpipeSocketStrategy = NpipeSocketStrategy;
//# sourceMappingURL=npipe-socket-strategy.js.map