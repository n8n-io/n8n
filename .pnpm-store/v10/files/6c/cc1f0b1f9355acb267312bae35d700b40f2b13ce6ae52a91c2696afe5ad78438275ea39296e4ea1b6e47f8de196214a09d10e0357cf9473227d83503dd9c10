"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RootlessUnixSocketStrategy = void 0;
const fs_1 = require("fs");
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const common_1 = require("../../common");
class RootlessUnixSocketStrategy {
    platform;
    env;
    constructor(platform = process.platform, env = process.env) {
        this.platform = platform;
        this.env = env;
    }
    getName() {
        return "RootlessUnixSocketStrategy";
    }
    async getResult() {
        if (this.platform !== "linux" && this.platform !== "darwin") {
            return;
        }
        const socketPath = [
            this.getSocketPathFromEnv(),
            this.getSocketPathFromHomeRunDir(),
            this.getSocketPathFromHomeDesktopDir(),
            this.getSocketPathFromRunDir(),
        ]
            .filter(common_1.isDefined)
            .find((candidateSocketPath) => (0, fs_1.existsSync)(candidateSocketPath));
        if (!socketPath) {
            return;
        }
        return {
            uri: `unix://${socketPath}`,
            dockerOptions: { socketPath },
            composeEnvironment: {},
            allowUserOverrides: true,
        };
    }
    getSocketPathFromEnv() {
        const xdgRuntimeDir = this.env["XDG_RUNTIME_DIR"];
        if (xdgRuntimeDir !== undefined) {
            return path_1.default.join(xdgRuntimeDir, "docker.sock");
        }
        else {
            return undefined;
        }
    }
    getSocketPathFromHomeRunDir() {
        return path_1.default.join(os_1.default.homedir(), ".docker", "run", "docker.sock");
    }
    getSocketPathFromHomeDesktopDir() {
        return path_1.default.join(os_1.default.homedir(), ".docker", "desktop", "docker.sock");
    }
    getSocketPathFromRunDir() {
        return path_1.default.join("/run", "user", `${os_1.default.userInfo().uid}`, "docker.sock");
    }
}
exports.RootlessUnixSocketStrategy = RootlessUnixSocketStrategy;
//# sourceMappingURL=rootless-unix-socket-strategy.js.map