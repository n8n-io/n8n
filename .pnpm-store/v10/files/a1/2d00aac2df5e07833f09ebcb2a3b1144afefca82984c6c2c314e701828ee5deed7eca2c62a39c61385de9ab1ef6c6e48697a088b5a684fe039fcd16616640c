"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRemoteContainerRuntimeSocketPath = void 0;
const getRemoteContainerRuntimeSocketPath = (containerRuntimeStrategyResult, containerRuntimeOs, platform = process.platform, env = process.env) => {
    if (containerRuntimeStrategyResult.allowUserOverrides) {
        if (env["TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE"] !== undefined) {
            return env["TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE"];
        }
    }
    let socketPath;
    if (containerRuntimeOs === "Docker Desktop") {
        socketPath = "/var/run/docker.sock";
    }
    else if (containerRuntimeStrategyResult.uri.startsWith("unix://")) {
        socketPath = containerRuntimeStrategyResult.uri.replace("unix://", "");
    }
    else {
        socketPath = "/var/run/docker.sock";
    }
    return platform === "win32" ? `/${socketPath}` : socketPath;
};
exports.getRemoteContainerRuntimeSocketPath = getRemoteContainerRuntimeSocketPath;
//# sourceMappingURL=remote-container-runtime-socket-path.js.map