"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractStartedContainer = void 0;
class AbstractStartedContainer {
    startedTestContainer;
    constructor(startedTestContainer) {
        this.startedTestContainer = startedTestContainer;
    }
    async stop(options) {
        if (this.containerStopping) {
            await this.containerStopping();
        }
        const stoppedContainer = await this.startedTestContainer.stop(options);
        if (this.containerStopped) {
            await this.containerStopped();
        }
        return stoppedContainer;
    }
    async restart(options) {
        return this.startedTestContainer.restart(options);
    }
    async commit(options) {
        return this.startedTestContainer.commit(options);
    }
    getHost() {
        return this.startedTestContainer.getHost();
    }
    getHostname() {
        return this.startedTestContainer.getHostname();
    }
    getFirstMappedPort() {
        return this.startedTestContainer.getFirstMappedPort();
    }
    getMappedPort(port, protocol) {
        if (typeof port === "number") {
            return this.startedTestContainer.getMappedPort(port, protocol);
        }
        return this.startedTestContainer.getMappedPort(port);
    }
    getName() {
        return this.startedTestContainer.getName();
    }
    getLabels() {
        return this.startedTestContainer.getLabels();
    }
    getId() {
        return this.startedTestContainer.getId();
    }
    getNetworkNames() {
        return this.startedTestContainer.getNetworkNames();
    }
    getNetworkId(networkName) {
        return this.startedTestContainer.getNetworkId(networkName);
    }
    getIpAddress(networkName) {
        return this.startedTestContainer.getIpAddress(networkName);
    }
    async copyFilesToContainer(filesToCopy) {
        return this.startedTestContainer.copyFilesToContainer(filesToCopy);
    }
    async copyDirectoriesToContainer(directoriesToCopy) {
        return this.startedTestContainer.copyDirectoriesToContainer(directoriesToCopy);
    }
    async copyContentToContainer(contentsToCopy) {
        return this.startedTestContainer.copyContentToContainer(contentsToCopy);
    }
    copyArchiveToContainer(tar, target = "/") {
        return this.startedTestContainer.copyArchiveToContainer(tar, target);
    }
    copyArchiveFromContainer(path) {
        return this.startedTestContainer.copyArchiveFromContainer(path);
    }
    exec(command, opts) {
        return this.startedTestContainer.exec(command, opts);
    }
    logs(opts) {
        return this.startedTestContainer.logs(opts);
    }
    async [Symbol.asyncDispose]() {
        await this.stop();
    }
}
exports.AbstractStartedContainer = AbstractStartedContainer;
//# sourceMappingURL=abstract-started-container.js.map