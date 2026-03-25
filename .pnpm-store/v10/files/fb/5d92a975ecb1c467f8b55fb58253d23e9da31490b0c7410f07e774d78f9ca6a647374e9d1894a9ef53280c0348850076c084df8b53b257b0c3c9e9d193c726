"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenericContainer = void 0;
const archiver_1 = __importDefault(require("archiver"));
const async_lock_1 = __importDefault(require("async-lock"));
const common_1 = require("../common");
const container_runtime_1 = require("../container-runtime");
const types_1 = require("../container-runtime/clients/container/types");
const port_forwarder_1 = require("../port-forwarder/port-forwarder");
const reaper_1 = require("../reaper/reaper");
const bound_ports_1 = require("../utils/bound-ports");
const labels_1 = require("../utils/labels");
const map_inspect_result_1 = require("../utils/map-inspect-result");
const port_1 = require("../utils/port");
const pull_policy_1 = require("../utils/pull-policy");
const wait_1 = require("../wait-strategies/wait");
const wait_for_container_1 = require("../wait-strategies/wait-for-container");
const generic_container_builder_1 = require("./generic-container-builder");
const inspect_container_util_ports_exposed_1 = require("./inspect-container-util-ports-exposed");
const started_generic_container_1 = require("./started-generic-container");
const reusableContainerCreationLock = new async_lock_1.default();
class GenericContainer {
    static fromDockerfile(context, dockerfileName = "Dockerfile") {
        return new generic_container_builder_1.GenericContainerBuilder(context, dockerfileName);
    }
    createOpts;
    hostConfig;
    imageName;
    startupTimeoutMs;
    waitStrategy = wait_1.Wait.forListeningPorts();
    environment = {};
    exposedPorts = [];
    reuse = false;
    autoRemove = true;
    networkMode;
    networkAliases = [];
    pullPolicy = pull_policy_1.PullPolicy.defaultPolicy();
    logConsumer;
    filesToCopy = [];
    directoriesToCopy = [];
    contentsToCopy = [];
    archivesToCopy = [];
    healthCheck;
    constructor(image) {
        this.imageName = container_runtime_1.ImageName.fromString(image);
        this.createOpts = { Image: this.imageName.string };
        this.hostConfig = { AutoRemove: this.imageName.string === reaper_1.REAPER_IMAGE };
    }
    isHelperContainer() {
        return this.isReaper() || this.imageName.string === port_forwarder_1.SSHD_IMAGE;
    }
    isReaper() {
        return this.imageName.string === reaper_1.REAPER_IMAGE;
    }
    async start() {
        const client = await (0, container_runtime_1.getContainerRuntimeClient)();
        await client.image.pull(this.imageName, {
            force: this.pullPolicy.shouldPull(),
            platform: this.createOpts.platform,
        });
        if (this.beforeContainerCreated) {
            await this.beforeContainerCreated();
        }
        if (!this.isHelperContainer() && port_forwarder_1.PortForwarderInstance.isRunning()) {
            const portForwarder = await port_forwarder_1.PortForwarderInstance.getInstance();
            this.hostConfig.ExtraHosts = [
                ...(this.hostConfig.ExtraHosts ?? []),
                `host.testcontainers.internal:${portForwarder.getIpAddress()}`,
            ];
        }
        this.hostConfig.NetworkMode = this.networkAliases.length > 0 ? undefined : this.networkMode;
        this.createOpts.Labels = { ...(0, labels_1.createLabels)(), ...this.createOpts.Labels };
        if (process.env.TESTCONTAINERS_REUSE_ENABLE !== "false" && this.reuse) {
            return this.reuseOrStartContainer(client);
        }
        if (!this.isReaper()) {
            const reaper = await (0, reaper_1.getReaper)(client);
            this.createOpts.Labels = { ...this.createOpts.Labels, [labels_1.LABEL_TESTCONTAINERS_SESSION_ID]: reaper.sessionId };
        }
        return this.startContainer(client);
    }
    async reuseOrStartContainer(client) {
        const containerHash = (0, common_1.hash)(JSON.stringify(this.createOpts));
        this.createOpts.Labels = { ...this.createOpts.Labels, [labels_1.LABEL_TESTCONTAINERS_CONTAINER_HASH]: containerHash };
        common_1.log.debug(`Container reuse has been enabled with hash "${containerHash}"`);
        return reusableContainerCreationLock.acquire(containerHash, async () => {
            const container = await client.container.fetchByLabel(labels_1.LABEL_TESTCONTAINERS_CONTAINER_HASH, containerHash, {
                status: types_1.CONTAINER_STATUSES.filter((status) => status !== "removing" && status !== "dead" && status !== "restarting"),
            });
            if (container !== undefined) {
                common_1.log.debug(`Found container to reuse with hash "${containerHash}"`, { containerId: container.id });
                return this.reuseContainer(client, container);
            }
            common_1.log.debug("No container found to reuse");
            return this.startContainer(client);
        });
    }
    async reuseContainer(client, container) {
        let inspectResult = await client.container.inspect(container);
        if (!inspectResult.State.Running) {
            common_1.log.debug("Reused container is not running, attempting to start it");
            await client.container.start(container);
            inspectResult = await (0, inspect_container_util_ports_exposed_1.inspectContainerUntilPortsExposed)(() => client.container.inspect(container), container.id);
        }
        const mappedInspectResult = (0, map_inspect_result_1.mapInspectResult)(inspectResult);
        const boundPorts = bound_ports_1.BoundPorts.fromInspectResult(client.info.containerRuntime.hostIps, mappedInspectResult).filter(this.exposedPorts);
        if (this.startupTimeoutMs !== undefined) {
            this.waitStrategy.withStartupTimeout(this.startupTimeoutMs);
        }
        await (0, wait_for_container_1.waitForContainer)(client, container, this.waitStrategy, boundPorts);
        return new started_generic_container_1.StartedGenericContainer(container, client.info.containerRuntime.host, inspectResult, boundPorts, inspectResult.Name, this.waitStrategy, this.autoRemove);
    }
    async startContainer(client) {
        const container = await client.container.create({ ...this.createOpts, HostConfig: this.hostConfig });
        if (!this.isHelperContainer() && port_forwarder_1.PortForwarderInstance.isRunning()) {
            await this.connectContainerToPortForwarder(client, container);
        }
        if (this.networkMode && this.networkAliases.length > 0) {
            const network = client.network.getById(this.networkMode);
            await client.container.connectToNetwork(container, network, this.networkAliases);
        }
        if (this.filesToCopy.length > 0 || this.directoriesToCopy.length > 0 || this.contentsToCopy.length > 0) {
            const archive = this.createArchiveToCopyToContainer();
            archive.finalize();
            await client.container.putArchive(container, archive, "/");
        }
        for (const archive of this.archivesToCopy) {
            await client.container.putArchive(container, archive.tar, archive.target);
        }
        common_1.log.info(`Starting container for image "${this.createOpts.Image}"...`, { containerId: container.id });
        if (this.containerCreated) {
            await this.containerCreated(container.id);
        }
        await client.container.start(container);
        common_1.log.info(`Started container for image "${this.createOpts.Image}"`, { containerId: container.id });
        const inspectResult = await (0, inspect_container_util_ports_exposed_1.inspectContainerUntilPortsExposed)(() => client.container.inspect(container), container.id);
        const mappedInspectResult = (0, map_inspect_result_1.mapInspectResult)(inspectResult);
        const boundPorts = bound_ports_1.BoundPorts.fromInspectResult(client.info.containerRuntime.hostIps, mappedInspectResult).filter(this.exposedPorts);
        if (this.startupTimeoutMs !== undefined) {
            this.waitStrategy.withStartupTimeout(this.startupTimeoutMs);
        }
        if (common_1.containerLog.enabled() || this.logConsumer !== undefined) {
            if (this.logConsumer !== undefined) {
                this.logConsumer(await client.container.logs(container));
            }
            if (common_1.containerLog.enabled()) {
                (await client.container.logs(container))
                    .on("data", (data) => common_1.containerLog.trace(data.trim(), { containerId: container.id }))
                    .on("err", (data) => common_1.containerLog.error(data.trim(), { containerId: container.id }));
            }
        }
        if (this.containerStarting) {
            await this.containerStarting(mappedInspectResult, false);
        }
        await (0, wait_for_container_1.waitForContainer)(client, container, this.waitStrategy, boundPorts);
        const startedContainer = new started_generic_container_1.StartedGenericContainer(container, client.info.containerRuntime.host, inspectResult, boundPorts, inspectResult.Name, this.waitStrategy, this.autoRemove);
        if (this.containerStarted) {
            await this.containerStarted(startedContainer, mappedInspectResult, false);
        }
        return startedContainer;
    }
    async connectContainerToPortForwarder(client, container) {
        const portForwarder = await port_forwarder_1.PortForwarderInstance.getInstance();
        const portForwarderNetworkId = portForwarder.getNetworkId();
        const excludedNetworks = [portForwarderNetworkId, "none", "host"];
        if (!this.networkMode || !excludedNetworks.includes(this.networkMode)) {
            const network = client.network.getById(portForwarderNetworkId);
            await client.container.connectToNetwork(container, network, []);
        }
    }
    createArchiveToCopyToContainer() {
        const tar = (0, archiver_1.default)("tar");
        for (const { source, target, mode } of this.filesToCopy) {
            tar.file(source, { name: target, mode });
        }
        for (const { source, target, mode } of this.directoriesToCopy) {
            tar.directory(source, target, { mode });
        }
        for (const { content, target, mode } of this.contentsToCopy) {
            tar.append(content, { name: target, mode });
        }
        return tar;
    }
    withCommand(command) {
        this.createOpts.Cmd = command;
        return this;
    }
    withEntrypoint(entrypoint) {
        this.createOpts.Entrypoint = entrypoint;
        return this;
    }
    withName(name) {
        this.createOpts.name = name;
        return this;
    }
    withLabels(labels) {
        this.createOpts.Labels = { ...this.createOpts.Labels, ...labels };
        return this;
    }
    withEnvironment(environment) {
        this.environment = { ...this.environment, ...environment };
        this.createOpts.Env = [
            ...(this.createOpts.Env ?? []),
            ...Object.entries(environment).map(([key, value]) => `${key}=${value}`),
        ];
        return this;
    }
    withPlatform(platform) {
        this.createOpts.platform = platform;
        return this;
    }
    withTmpFs(tmpFs) {
        this.hostConfig.Tmpfs = { ...this.hostConfig.Tmpfs, ...tmpFs };
        return this;
    }
    withUlimits(ulimits) {
        this.hostConfig.Ulimits = [
            ...(this.hostConfig.Ulimits ?? []),
            ...Object.entries(ulimits).map(([key, value]) => ({
                Name: key,
                Hard: value.hard,
                Soft: value.soft,
            })),
        ];
        return this;
    }
    withAddedCapabilities(...capabilities) {
        this.hostConfig.CapAdd = [...(this.hostConfig.CapAdd ?? []), ...capabilities];
        return this;
    }
    withDroppedCapabilities(...capabilities) {
        this.hostConfig.CapDrop = [...(this.hostConfig.CapDrop ?? []), ...capabilities];
        return this;
    }
    withNetwork(network) {
        this.networkMode = network.getName();
        return this;
    }
    withNetworkMode(networkMode) {
        this.networkMode = networkMode;
        return this;
    }
    withNetworkAliases(...networkAliases) {
        this.networkAliases = [...this.networkAliases, ...networkAliases];
        return this;
    }
    withExtraHosts(extraHosts) {
        this.hostConfig.ExtraHosts = [
            ...(this.hostConfig.ExtraHosts ?? []),
            ...extraHosts.map((extraHost) => `${extraHost.host}:${extraHost.ipAddress}`),
        ];
        return this;
    }
    withExposedPorts(...ports) {
        const exposedPorts = {};
        for (const exposedPort of ports) {
            const containerPort = (0, port_1.getContainerPort)(exposedPort);
            const protocol = (0, port_1.getProtocol)(exposedPort);
            exposedPorts[`${containerPort}/${protocol}`] = {};
        }
        this.exposedPorts = [...this.exposedPorts, ...ports];
        this.createOpts.ExposedPorts = {
            ...this.createOpts.ExposedPorts,
            ...exposedPorts,
        };
        const portBindings = {};
        for (const exposedPort of ports) {
            const protocol = (0, port_1.getProtocol)(exposedPort);
            if ((0, port_1.hasHostBinding)(exposedPort)) {
                portBindings[`${exposedPort.container}/${protocol}`] = [{ HostPort: exposedPort.host.toString() }];
            }
            else {
                const containerPort = (0, port_1.getContainerPort)(exposedPort);
                portBindings[`${containerPort}/${protocol}`] = [{ HostPort: "0" }];
            }
        }
        this.hostConfig.PortBindings = {
            ...this.hostConfig.PortBindings,
            ...portBindings,
        };
        return this;
    }
    withBindMounts(bindMounts) {
        this.hostConfig.Binds = bindMounts
            .map((bindMount) => ({ mode: "rw", ...bindMount }))
            .map(({ source, target, mode }) => `${source}:${target}:${mode}`);
        return this;
    }
    withHealthCheck(healthCheck) {
        this.healthCheck = healthCheck;
        this.createOpts.Healthcheck = {
            Test: healthCheck.test,
            Interval: healthCheck.interval ? (0, common_1.toNanos)(healthCheck.interval) : 0,
            Timeout: healthCheck.timeout ? (0, common_1.toNanos)(healthCheck.timeout) : 0,
            Retries: healthCheck.retries ?? 0,
            StartPeriod: healthCheck.startPeriod ? (0, common_1.toNanos)(healthCheck.startPeriod) : 0,
        };
        return this;
    }
    withStartupTimeout(startupTimeoutMs) {
        this.startupTimeoutMs = startupTimeoutMs;
        return this;
    }
    withWaitStrategy(waitStrategy) {
        this.waitStrategy = waitStrategy;
        return this;
    }
    withDefaultLogDriver() {
        this.hostConfig.LogConfig = {
            Type: "json-file",
            Config: {},
        };
        return this;
    }
    withPrivilegedMode() {
        this.hostConfig.Privileged = true;
        return this;
    }
    withUser(user) {
        this.createOpts.User = user;
        return this;
    }
    withReuse() {
        this.reuse = true;
        return this;
    }
    withAutoRemove(autoRemove) {
        this.autoRemove = autoRemove;
        return this;
    }
    withPullPolicy(pullPolicy) {
        this.pullPolicy = pullPolicy;
        return this;
    }
    withIpcMode(ipcMode) {
        this.hostConfig.IpcMode = ipcMode;
        return this;
    }
    withCopyFilesToContainer(filesToCopy) {
        this.filesToCopy = [...this.filesToCopy, ...filesToCopy];
        return this;
    }
    withCopyDirectoriesToContainer(directoriesToCopy) {
        this.directoriesToCopy = [...this.directoriesToCopy, ...directoriesToCopy];
        return this;
    }
    withCopyContentToContainer(contentsToCopy) {
        this.contentsToCopy = [...this.contentsToCopy, ...contentsToCopy];
        return this;
    }
    withCopyArchivesToContainer(archivesToCopy) {
        this.archivesToCopy = [...this.archivesToCopy, ...archivesToCopy];
        return this;
    }
    withWorkingDir(workingDir) {
        this.createOpts.WorkingDir = workingDir;
        return this;
    }
    withResourcesQuota({ memory, cpu }) {
        this.hostConfig.Memory = memory !== undefined ? Math.ceil(memory * 1024 ** 3) : undefined;
        this.hostConfig.NanoCpus = cpu !== undefined ? Math.ceil(cpu * 10 ** 9) : undefined;
        return this;
    }
    withSharedMemorySize(bytes) {
        this.hostConfig.ShmSize = bytes;
        return this;
    }
    withLogConsumer(logConsumer) {
        this.logConsumer = logConsumer;
        return this;
    }
    withHostname(hostname) {
        this.createOpts.Hostname = hostname;
        return this;
    }
}
exports.GenericContainer = GenericContainer;
//# sourceMappingURL=generic-container.js.map