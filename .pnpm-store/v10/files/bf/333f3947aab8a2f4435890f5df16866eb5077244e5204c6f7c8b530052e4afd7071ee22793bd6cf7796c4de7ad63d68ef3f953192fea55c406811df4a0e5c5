"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StartedGenericContainer = void 0;
const archiver_1 = __importDefault(require("archiver"));
const async_lock_1 = __importDefault(require("async-lock"));
const common_1 = require("../common");
const container_runtime_1 = require("../container-runtime");
const reaper_1 = require("../reaper/reaper");
const bound_ports_1 = require("../utils/bound-ports");
const labels_1 = require("../utils/labels");
const map_inspect_result_1 = require("../utils/map-inspect-result");
const wait_for_container_1 = require("../wait-strategies/wait-for-container");
const inspect_container_util_ports_exposed_1 = require("./inspect-container-util-ports-exposed");
const stopped_generic_container_1 = require("./stopped-generic-container");
class StartedGenericContainer {
    container;
    host;
    inspectResult;
    boundPorts;
    name;
    waitStrategy;
    autoRemove;
    stoppedContainer;
    stopContainerLock = new async_lock_1.default();
    constructor(container, host, inspectResult, boundPorts, name, waitStrategy, autoRemove) {
        this.container = container;
        this.host = host;
        this.inspectResult = inspectResult;
        this.boundPorts = boundPorts;
        this.name = name;
        this.waitStrategy = waitStrategy;
        this.autoRemove = autoRemove;
    }
    async stop(options = {}) {
        return this.stopContainerLock.acquire("stop", async () => {
            if (this.stoppedContainer) {
                return this.stoppedContainer;
            }
            this.stoppedContainer = await this.stopContainer(options);
            return this.stoppedContainer;
        });
    }
    /**
     * Construct the command(s) to apply changes to the container before committing it to an image.
     */
    async getContainerCommitChangeCommands(options) {
        const { deleteOnExit, client } = options;
        const changes = options.changes || [];
        if (deleteOnExit) {
            let sessionId = this.getLabels()[labels_1.LABEL_TESTCONTAINERS_SESSION_ID];
            if (!sessionId) {
                sessionId = await (0, reaper_1.getReaper)(client).then((reaper) => reaper.sessionId);
            }
            changes.push(`LABEL ${labels_1.LABEL_TESTCONTAINERS_SESSION_ID}=${sessionId}`);
        }
        else if (!deleteOnExit && this.getLabels()[labels_1.LABEL_TESTCONTAINERS_SESSION_ID]) {
            // By default, commit will save the existing labels (including the session ID) to the new image.  If
            // deleteOnExit is false, we need to remove the session ID label.
            changes.push(`LABEL ${labels_1.LABEL_TESTCONTAINERS_SESSION_ID}=`);
        }
        return changes.join("\n");
    }
    async commit(options) {
        const client = await (0, container_runtime_1.getContainerRuntimeClient)();
        const { deleteOnExit = true, changes, ...commitOpts } = options;
        const changeCommands = await this.getContainerCommitChangeCommands({ deleteOnExit, changes, client });
        const imageId = await client.container.commit(this.container, { ...commitOpts, changes: changeCommands });
        return imageId;
    }
    async restart(options = {}) {
        common_1.log.info(`Restarting container...`, { containerId: this.container.id });
        const client = await (0, container_runtime_1.getContainerRuntimeClient)();
        const resolvedOptions = { timeout: 0, ...options };
        await client.container.restart(this.container, resolvedOptions);
        this.inspectResult = await (0, inspect_container_util_ports_exposed_1.inspectContainerUntilPortsExposed)(() => client.container.inspect(this.container), this.container.id);
        const mappedInspectResult = (0, map_inspect_result_1.mapInspectResult)(this.inspectResult);
        const startTime = new Date(this.inspectResult.State.StartedAt);
        if (common_1.containerLog.enabled()) {
            (await client.container.logs(this.container, { since: startTime.getTime() / 1000 }))
                .on("data", (data) => common_1.containerLog.trace(data.trim(), { containerId: this.container.id }))
                .on("err", (data) => common_1.containerLog.error(data.trim(), { containerId: this.container.id }));
        }
        this.boundPorts = bound_ports_1.BoundPorts.fromInspectResult(client.info.containerRuntime.hostIps, mappedInspectResult).filter(Array.from(this.boundPorts.iterator()).map((port) => {
            const [portNumber, protocol] = port[0].split("/");
            return `${portNumber}/${protocol}`;
        }));
        await (0, wait_for_container_1.waitForContainer)(client, this.container, this.waitStrategy, this.boundPorts, startTime);
        common_1.log.info(`Restarted container`, { containerId: this.container.id });
    }
    async stopContainer(options = {}) {
        common_1.log.info(`Stopping container...`, { containerId: this.container.id });
        const client = await (0, container_runtime_1.getContainerRuntimeClient)();
        if (this.containerIsStopping) {
            await this.containerIsStopping();
        }
        const resolvedOptions = { remove: this.autoRemove, timeout: 0, removeVolumes: true, ...options };
        await client.container.stop(this.container, { timeout: resolvedOptions.timeout });
        if (resolvedOptions.remove) {
            await client.container.remove(this.container, { removeVolumes: resolvedOptions.removeVolumes });
        }
        common_1.log.info(`Stopped container`, { containerId: this.container.id });
        if (this.containerIsStopped) {
            await this.containerIsStopped();
        }
        return new stopped_generic_container_1.StoppedGenericContainer(this.container);
    }
    getHost() {
        return this.host;
    }
    getHostname() {
        return this.inspectResult.Config.Hostname;
    }
    getFirstMappedPort() {
        return this.boundPorts.getFirstBinding();
    }
    getMappedPort(port, protocol = "tcp") {
        return this.boundPorts.getBinding(port, protocol);
    }
    getId() {
        return this.container.id;
    }
    getName() {
        return this.name;
    }
    getLabels() {
        return this.inspectResult.Config.Labels;
    }
    getNetworkNames() {
        return Object.keys(this.getNetworkSettings());
    }
    getNetworkId(networkName) {
        return this.getNetworkSettings()[networkName].networkId;
    }
    getIpAddress(networkName) {
        return this.getNetworkSettings()[networkName].ipAddress;
    }
    getNetworkSettings() {
        return Object.entries(this.inspectResult.NetworkSettings.Networks)
            .map(([networkName, network]) => ({
            [networkName]: {
                networkId: network.NetworkID,
                ipAddress: network.IPAddress,
            },
        }))
            .reduce((prev, next) => ({ ...prev, ...next }), {});
    }
    async copyFilesToContainer(filesToCopy) {
        common_1.log.debug(`Copying files to container...`, { containerId: this.container.id });
        const client = await (0, container_runtime_1.getContainerRuntimeClient)();
        const tar = (0, archiver_1.default)("tar");
        filesToCopy.forEach(({ source, target }) => tar.file(source, { name: target }));
        tar.finalize();
        await client.container.putArchive(this.container, tar, "/");
        common_1.log.debug(`Copied files to container`, { containerId: this.container.id });
    }
    async copyDirectoriesToContainer(directoriesToCopy) {
        common_1.log.debug(`Copying directories to container...`, { containerId: this.container.id });
        const client = await (0, container_runtime_1.getContainerRuntimeClient)();
        const tar = (0, archiver_1.default)("tar");
        directoriesToCopy.forEach(({ source, target }) => tar.directory(source, target));
        tar.finalize();
        await client.container.putArchive(this.container, tar, "/");
        common_1.log.debug(`Copied directories to container`, { containerId: this.container.id });
    }
    async copyContentToContainer(contentsToCopy) {
        common_1.log.debug(`Copying content to container...`, { containerId: this.container.id });
        const client = await (0, container_runtime_1.getContainerRuntimeClient)();
        const tar = (0, archiver_1.default)("tar");
        contentsToCopy.forEach(({ content, target, mode }) => tar.append(content, { name: target, mode: mode }));
        tar.finalize();
        await client.container.putArchive(this.container, tar, "/");
        common_1.log.debug(`Copied content to container`, { containerId: this.container.id });
    }
    async copyArchiveToContainer(tar, target = "/") {
        common_1.log.debug(`Copying archive to container...`, { containerId: this.container.id });
        const client = await (0, container_runtime_1.getContainerRuntimeClient)();
        await client.container.putArchive(this.container, tar, target);
        common_1.log.debug(`Copied archive to container`, { containerId: this.container.id });
    }
    async copyArchiveFromContainer(path) {
        common_1.log.debug(`Copying archive "${path}" from container...`, { containerId: this.container.id });
        const client = await (0, container_runtime_1.getContainerRuntimeClient)();
        const stream = await client.container.fetchArchive(this.container, path);
        common_1.log.debug(`Copied archive "${path}" from container`, { containerId: this.container.id });
        return stream;
    }
    async exec(command, opts) {
        const commandArr = Array.isArray(command) ? command : command.split(" ");
        const commandStr = commandArr.join(" ");
        const client = await (0, container_runtime_1.getContainerRuntimeClient)();
        common_1.log.debug(`Executing command "${commandStr}"...`, { containerId: this.container.id });
        const output = await client.container.exec(this.container, commandArr, opts);
        common_1.log.debug(`Executed command "${commandStr}"...`, { containerId: this.container.id });
        return output;
    }
    async logs(opts) {
        const client = await (0, container_runtime_1.getContainerRuntimeClient)();
        return client.container.logs(this.container, opts);
    }
    async [Symbol.asyncDispose]() {
        await this.stop();
    }
}
exports.StartedGenericContainer = StartedGenericContainer;
//# sourceMappingURL=started-generic-container.js.map