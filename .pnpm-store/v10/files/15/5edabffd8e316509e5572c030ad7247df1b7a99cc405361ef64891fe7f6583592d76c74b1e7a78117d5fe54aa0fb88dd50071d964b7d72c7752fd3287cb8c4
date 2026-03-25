"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PortForwarderInstance = exports.SSHD_IMAGE = void 0;
const ssh_remote_port_forward_1 = require("ssh-remote-port-forward");
const common_1 = require("../common");
const container_runtime_1 = require("../container-runtime");
const generic_container_1 = require("../generic-container/generic-container");
const reaper_1 = require("../reaper/reaper");
const labels_1 = require("../utils/labels");
exports.SSHD_IMAGE = process.env["SSHD_CONTAINER_IMAGE"]
    ? container_runtime_1.ImageName.fromString(process.env["SSHD_CONTAINER_IMAGE"]).string
    : container_runtime_1.ImageName.fromString("testcontainers/sshd:1.3.0").string;
class PortForwarder {
    sshConnection;
    containerId;
    networkId;
    ipAddress;
    networkName;
    constructor(sshConnection, containerId, networkId, ipAddress, networkName) {
        this.sshConnection = sshConnection;
        this.containerId = containerId;
        this.networkId = networkId;
        this.ipAddress = ipAddress;
        this.networkName = networkName;
    }
    async exposeHostPort(port) {
        common_1.log.info(`Exposing host port ${port}...`);
        await this.sshConnection.remoteForward("localhost", port);
        common_1.log.info(`Exposed host port ${port}`);
    }
    getContainerId() {
        return this.containerId;
    }
    getNetworkId() {
        return this.networkId;
    }
    getIpAddress() {
        return this.ipAddress;
    }
}
class PortForwarderInstance {
    static USERNAME = "root";
    static PASSWORD = "root";
    static instance;
    static isRunning() {
        return this.instance !== undefined;
    }
    static async getInstance() {
        if (!this.instance) {
            await (0, common_1.withFileLock)("testcontainers-node-sshd.lock", async () => {
                const client = await (0, container_runtime_1.getContainerRuntimeClient)();
                const reaper = await (0, reaper_1.getReaper)(client);
                const sessionId = reaper.sessionId;
                const portForwarderContainer = await this.findPortForwarderContainer(client, sessionId);
                if (portForwarderContainer) {
                    this.instance = this.reuseInstance(client, portForwarderContainer, sessionId);
                }
                else {
                    this.instance = this.createInstance();
                }
                await this.instance;
            });
        }
        return this.instance;
    }
    static async findPortForwarderContainer(client, sessionId) {
        const containers = await client.container.list();
        return containers.find((container) => container.State === "running" &&
            container.Labels[labels_1.LABEL_TESTCONTAINERS_SSHD] === "true" &&
            container.Labels[labels_1.LABEL_TESTCONTAINERS_SESSION_ID] === sessionId);
    }
    static async reuseInstance(client, container, sessionId) {
        common_1.log.debug(`Reusing existing PortForwarder for session "${sessionId}"...`);
        const host = client.info.containerRuntime.host;
        const port = container.Ports.find((port) => port.PrivatePort == 22)?.PublicPort;
        if (!port) {
            throw new Error("Expected PortForwarder to map exposed port 22");
        }
        common_1.log.debug(`Connecting to Port Forwarder on "${host}:${port}"...`);
        const connection = await (0, ssh_remote_port_forward_1.createSshConnection)({
            host,
            port,
            username: "root",
            password: "root",
            readyTimeout: 100_000,
        });
        common_1.log.debug(`Connected to Port Forwarder on "${host}:${port}"`);
        connection.unref();
        const containerId = container.Id;
        const networks = Object.entries(container.NetworkSettings.Networks);
        const networkName = networks[0][0];
        const networkId = container.NetworkSettings.Networks[networkName].NetworkID;
        const ipAddress = container.NetworkSettings.Networks[networkName].IPAddress;
        return new PortForwarder(connection, containerId, networkId, ipAddress, networkName);
    }
    static async createInstance() {
        common_1.log.debug(`Creating new Port Forwarder...`);
        const client = await (0, container_runtime_1.getContainerRuntimeClient)();
        const reaper = await (0, reaper_1.getReaper)(client);
        const containerPort = process.env["TESTCONTAINERS_SSHD_PORT"]
            ? { container: 22, host: Number(process.env["TESTCONTAINERS_SSHD_PORT"]) }
            : 22;
        const container = await new generic_container_1.GenericContainer(exports.SSHD_IMAGE)
            .withName(`testcontainers-port-forwarder-${reaper.sessionId}`)
            .withExposedPorts(containerPort)
            .withEnvironment({ PASSWORD: this.PASSWORD })
            .withLabels({ [labels_1.LABEL_TESTCONTAINERS_SSHD]: "true" })
            .start();
        const host = client.info.containerRuntime.host;
        const port = container.getMappedPort(22);
        common_1.log.debug(`Connecting to Port Forwarder on "${host}:${port}"...`);
        const connection = await (0, ssh_remote_port_forward_1.createSshConnection)({ host, port, username: this.USERNAME, password: this.PASSWORD });
        common_1.log.debug(`Connected to Port Forwarder on "${host}:${port}"`);
        connection.unref();
        const containerId = container.getId();
        const networkName = container.getNetworkNames()[0];
        const networkId = container.getNetworkId(networkName);
        const ipAddress = container.getIpAddress(networkName);
        return new PortForwarder(connection, containerId, networkId, ipAddress, networkName);
    }
}
exports.PortForwarderInstance = PortForwarderInstance;
//# sourceMappingURL=port-forwarder.js.map