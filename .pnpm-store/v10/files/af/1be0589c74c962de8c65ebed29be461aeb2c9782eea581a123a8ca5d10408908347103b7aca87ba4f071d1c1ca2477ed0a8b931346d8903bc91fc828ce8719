"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveHost = void 0;
const fs_1 = require("fs");
const url_1 = require("url");
const common_1 = require("../../common");
const run_in_container_1 = require("./run-in-container");
const resolveHost = async (dockerode, strategyResult, indexServerAddress, env = process.env) => {
    if (strategyResult.allowUserOverrides) {
        if (env.TESTCONTAINERS_HOST_OVERRIDE !== undefined) {
            return env.TESTCONTAINERS_HOST_OVERRIDE;
        }
    }
    const { protocol, hostname } = new url_1.URL(strategyResult.uri);
    switch (protocol) {
        case "http:":
        case "https:":
        case "tcp:":
            return hostname;
        case "unix:":
        case "npipe:": {
            if (isInContainer()) {
                const networkName = strategyResult.uri.includes("podman.sock") ? "podman" : "bridge";
                const gateway = await findGateway(dockerode, networkName);
                if (gateway !== undefined) {
                    return gateway;
                }
                const defaultGateway = await findDefaultGateway(dockerode, indexServerAddress);
                if (defaultGateway !== undefined) {
                    return defaultGateway;
                }
            }
            return "localhost";
        }
        default:
            throw new Error(`Unsupported protocol: ${protocol}`);
    }
};
exports.resolveHost = resolveHost;
const findGateway = async (dockerode, networkName) => {
    common_1.log.debug(`Checking gateway for Docker host...`);
    const inspectResult = await dockerode.getNetwork(networkName).inspect();
    return inspectResult?.IPAM?.Config?.find((config) => config.Gateway !== undefined)?.Gateway;
};
const findDefaultGateway = async (dockerode, indexServerAddress) => {
    common_1.log.debug(`Checking default gateway for Docker host...`);
    return (0, run_in_container_1.runInContainer)(dockerode, indexServerAddress, "alpine:3.14", [
        "sh",
        "-c",
        "ip route|awk '/default/ { print $3 }'",
    ]);
};
const isInContainer = () => (0, fs_1.existsSync)("/.dockerenv");
//# sourceMappingURL=resolve-host.js.map