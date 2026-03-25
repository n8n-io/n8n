"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REAPER_IMAGE = void 0;
exports.getReaper = getReaper;
const net_1 = require("net");
const common_1 = require("../common");
const container_runtime_1 = require("../container-runtime");
const generic_container_1 = require("../generic-container/generic-container");
const labels_1 = require("../utils/labels");
const wait_1 = require("../wait-strategies/wait");
exports.REAPER_IMAGE = process.env["RYUK_CONTAINER_IMAGE"]
    ? container_runtime_1.ImageName.fromString(process.env["RYUK_CONTAINER_IMAGE"]).string
    : container_runtime_1.ImageName.fromString("testcontainers/ryuk:0.14.0").string;
let reaper;
let sessionId;
async function getReaper(client) {
    if (reaper) {
        return reaper;
    }
    reaper = await (0, common_1.withFileLock)("testcontainers-node.lock", async () => {
        const reaperContainer = await findReaperContainer(client);
        sessionId = reaperContainer?.Labels[labels_1.LABEL_TESTCONTAINERS_SESSION_ID] ?? new common_1.RandomUuid().nextUuid();
        if (process.env.TESTCONTAINERS_RYUK_DISABLED === "true") {
            return new DisabledReaper(sessionId, "");
        }
        else if (reaperContainer) {
            return await useExistingReaper(reaperContainer, sessionId, client.info.containerRuntime.host);
        }
        else {
            return await createNewReaper(sessionId, client.info.containerRuntime.remoteSocketPath);
        }
    });
    reaper.addSession(sessionId);
    return reaper;
}
async function findReaperContainer(client) {
    const containers = await client.container.list();
    return containers.find((container) => container.State === "running" &&
        container.Labels[labels_1.LABEL_TESTCONTAINERS_RYUK] === "true" &&
        container.Labels["TESTCONTAINERS_RYUK_TEST_LABEL"] !== "true");
}
async function useExistingReaper(reaperContainer, sessionId, host) {
    common_1.log.debug(`Reusing existing Reaper for session "${sessionId}"...`);
    const reaperPort = reaperContainer.Ports.find((port) => port.PrivatePort == 8080)?.PublicPort;
    if (!reaperPort) {
        throw new Error("Expected Reaper to map exposed port 8080");
    }
    const socket = await connectToReaperSocket(host, reaperPort, reaperContainer.Id);
    return new RyukReaper(sessionId, reaperContainer.Id, socket);
}
async function createNewReaper(sessionId, remoteSocketPath) {
    common_1.log.debug(`Creating new Reaper for session "${sessionId}" with socket path "${remoteSocketPath}"...`);
    const container = new generic_container_1.GenericContainer(exports.REAPER_IMAGE)
        .withName(`testcontainers-ryuk-${sessionId}`)
        .withExposedPorts(process.env["TESTCONTAINERS_RYUK_PORT"]
        ? { container: 8080, host: parseInt(process.env["TESTCONTAINERS_RYUK_PORT"]) }
        : 8080)
        .withBindMounts([{ source: remoteSocketPath, target: "/var/run/docker.sock" }])
        .withLabels({ [labels_1.LABEL_TESTCONTAINERS_SESSION_ID]: sessionId })
        .withWaitStrategy(wait_1.Wait.forLogMessage(/.*Started.*/));
    if (process.env["TESTCONTAINERS_RYUK_VERBOSE"]) {
        container.withEnvironment({ RYUK_VERBOSE: process.env["TESTCONTAINERS_RYUK_VERBOSE"] });
    }
    if (process.env["TESTCONTAINERS_RYUK_RECONNECTION_TIMEOUT"]) {
        container.withEnvironment({ RYUK_RECONNECTION_TIMEOUT: process.env["TESTCONTAINERS_RYUK_RECONNECTION_TIMEOUT"] });
    }
    if (process.env["TESTCONTAINERS_RYUK_PRIVILEGED"] === "true") {
        container.withPrivilegedMode();
    }
    if (process.env["TESTCONTAINERS_RYUK_TEST_LABEL"] === "true") {
        container.withLabels({ TESTCONTAINERS_RYUK_TEST_LABEL: "true" });
    }
    const startedContainer = await container.start();
    const socket = await connectToReaperSocket(startedContainer.getHost(), startedContainer.getMappedPort(8080), startedContainer.getId());
    return new RyukReaper(sessionId, startedContainer.getId(), socket);
}
async function connectToReaperSocket(host, port, containerId) {
    const retryResult = await new common_1.IntervalRetry(1000).retryUntil((attempt) => {
        return new Promise((resolve) => {
            common_1.log.debug(`Connecting to Reaper (attempt ${attempt + 1}) on "${host}:${port}"...`, { containerId });
            const socket = new net_1.Socket();
            socket
                .unref()
                .on("timeout", () => common_1.log.error(`Reaper ${containerId} socket timed out`))
                .on("error", (err) => common_1.log.error(`Reaper ${containerId} socket error: ${err}`))
                .on("close", (hadError) => {
                if (hadError) {
                    common_1.log.error(`Connection to Reaper closed with error`, { containerId });
                }
                else {
                    common_1.log.warn(`Connection to Reaper closed`, { containerId });
                }
                resolve(undefined);
            })
                .connect(port, host, () => {
                common_1.log.debug(`Connected to Reaper`, { containerId });
                resolve(socket);
            });
        });
    }, (result) => result !== undefined, () => {
        const message = `Failed to connect to Reaper`;
        common_1.log.error(message, { containerId });
        return new Error(message);
    }, 4000);
    if (retryResult instanceof net_1.Socket) {
        return retryResult;
    }
    else {
        throw retryResult;
    }
}
class RyukReaper {
    sessionId;
    containerId;
    socket;
    constructor(sessionId, containerId, socket) {
        this.sessionId = sessionId;
        this.containerId = containerId;
        this.socket = socket;
    }
    addComposeProject(projectName) {
        this.socket.write(`label=com.docker.compose.project=${projectName}\r\n`);
    }
    addSession(sessionId) {
        this.socket.write(`label=${labels_1.LABEL_TESTCONTAINERS_SESSION_ID}=${sessionId}\r\n`);
    }
}
class DisabledReaper {
    sessionId;
    containerId;
    constructor(sessionId, containerId) {
        this.sessionId = sessionId;
        this.containerId = containerId;
    }
    addComposeProject() { }
    addSession() { }
}
//# sourceMappingURL=reaper.js.map