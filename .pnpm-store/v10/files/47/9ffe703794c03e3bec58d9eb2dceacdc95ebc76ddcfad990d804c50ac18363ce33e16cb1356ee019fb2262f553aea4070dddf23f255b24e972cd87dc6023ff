"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContainerRuntimeClient = void 0;
exports.getContainerRuntimeClient = getContainerRuntimeClient;
const dockerode_1 = __importDefault(require("dockerode"));
const common_1 = require("../../common");
const version_1 = require("../../version");
const configuration_strategy_1 = require("../strategies/configuration-strategy");
const npipe_socket_strategy_1 = require("../strategies/npipe-socket-strategy");
const rootless_unix_socket_strategy_1 = require("../strategies/rootless-unix-socket-strategy");
const testcontainers_host_strategy_1 = require("../strategies/testcontainers-host-strategy");
const unix_socket_strategy_1 = require("../strategies/unix-socket-strategy");
const lookup_host_ips_1 = require("../utils/lookup-host-ips");
const remote_container_runtime_socket_path_1 = require("../utils/remote-container-runtime-socket-path");
const resolve_host_1 = require("../utils/resolve-host");
const compose_client_1 = require("./compose/compose-client");
const docker_container_client_1 = require("./container/docker-container-client");
const docker_image_client_1 = require("./image/docker-image-client");
const docker_network_client_1 = require("./network/docker-network-client");
class ContainerRuntimeClient {
    info;
    compose;
    container;
    image;
    network;
    constructor(info, compose, container, image, network) {
        this.info = info;
        this.compose = compose;
        this.container = container;
        this.image = image;
        this.network = network;
    }
}
exports.ContainerRuntimeClient = ContainerRuntimeClient;
let containerRuntimeClient;
async function getContainerRuntimeClient() {
    if (containerRuntimeClient) {
        return containerRuntimeClient;
    }
    const strategies = [
        new testcontainers_host_strategy_1.TestcontainersHostStrategy(),
        new configuration_strategy_1.ConfigurationStrategy(),
        new unix_socket_strategy_1.UnixSocketStrategy(),
        new rootless_unix_socket_strategy_1.RootlessUnixSocketStrategy(),
        new npipe_socket_strategy_1.NpipeSocketStrategy(),
    ];
    for (const strategy of strategies) {
        try {
            common_1.log.debug(`Checking container runtime strategy "${strategy.getName()}"...`);
            const client = await initStrategy(strategy);
            if (client) {
                common_1.log.debug(`Container runtime strategy "${strategy.getName()}" works`);
                containerRuntimeClient = client;
                return client;
            }
        }
        catch (err) {
            common_1.log.debug(`Container runtime strategy "${strategy.getName()}" does not work: "${err}"`);
            if (err !== null && typeof err === "object" && "stack" in err && typeof err.stack === "string") {
                common_1.log.debug(err.stack);
            }
        }
    }
    throw new Error("Could not find a working container runtime strategy");
}
async function initStrategy(strategy) {
    const result = await strategy.getResult();
    if (!result) {
        common_1.log.debug(`Container runtime strategy "${strategy.getName()}" is not applicable`);
        return undefined;
    }
    const dockerodeOptions = {
        ...result.dockerOptions,
        headers: { ...result.dockerOptions.headers, "User-Agent": `tc-node/${version_1.LIB_VERSION}` },
    };
    const dockerode = new dockerode_1.default(dockerodeOptions);
    common_1.log.trace("Fetching Docker info...");
    const dockerodeInfo = await dockerode.info();
    const indexServerAddress = !(0, common_1.isDefined)(dockerodeInfo.IndexServerAddress) || (0, common_1.isEmptyString)(dockerodeInfo.IndexServerAddress)
        ? "https://index.docker.io/v1/"
        : dockerodeInfo.IndexServerAddress;
    common_1.log.trace("Fetching remote container runtime socket path...");
    const remoteContainerRuntimeSocketPath = (0, remote_container_runtime_socket_path_1.getRemoteContainerRuntimeSocketPath)(result, dockerodeInfo.OperatingSystem);
    common_1.log.trace("Resolving host...");
    const host = await (0, resolve_host_1.resolveHost)(dockerode, result, indexServerAddress);
    common_1.log.trace("Fetching Compose info...");
    const composeClient = await (0, compose_client_1.getComposeClient)(result.composeEnvironment);
    const nodeInfo = {
        version: process.version,
        architecture: process.arch,
        platform: process.platform,
    };
    common_1.log.trace("Looking up host IPs...");
    const hostIps = await (0, lookup_host_ips_1.lookupHostIps)(host);
    common_1.log.trace("Initialising clients...");
    const containerClient = new docker_container_client_1.DockerContainerClient(dockerode);
    const imageClient = new docker_image_client_1.DockerImageClient(dockerode, indexServerAddress);
    const networkClient = new docker_network_client_1.DockerNetworkClient(dockerode);
    const containerRuntimeInfo = {
        host,
        hostIps,
        remoteSocketPath: remoteContainerRuntimeSocketPath,
        indexServerAddress: indexServerAddress,
        serverVersion: dockerodeInfo.ServerVersion,
        operatingSystem: dockerodeInfo.OperatingSystem,
        operatingSystemType: dockerodeInfo.OSType,
        architecture: dockerodeInfo.Architecture,
        cpus: dockerodeInfo.NCPU,
        memory: dockerodeInfo.MemTotal,
        runtimes: dockerodeInfo.Runtimes ? Object.keys(dockerodeInfo.Runtimes) : [],
        labels: dockerodeInfo.Labels ? dockerodeInfo.Labels : [],
    };
    const info = { node: nodeInfo, containerRuntime: containerRuntimeInfo };
    common_1.log.trace(`Container runtime info:\n${JSON.stringify(info, null, 2)}`);
    return new ContainerRuntimeClient(info, composeClient, containerClient, imageClient, networkClient);
}
//# sourceMappingURL=client.js.map