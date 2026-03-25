"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoppedNetwork = exports.StartedNetwork = exports.Network = void 0;
const common_1 = require("../common");
const container_runtime_1 = require("../container-runtime");
const reaper_1 = require("../reaper/reaper");
const labels_1 = require("../utils/labels");
class Network {
    uuid;
    constructor(uuid = new common_1.RandomUuid()) {
        this.uuid = uuid;
    }
    async start() {
        const client = await (0, container_runtime_1.getContainerRuntimeClient)();
        const reaper = await (0, reaper_1.getReaper)(client);
        const name = this.uuid.nextUuid();
        common_1.log.info(`Starting network "${name}"...`);
        const labels = (0, labels_1.createLabels)();
        labels[labels_1.LABEL_TESTCONTAINERS_SESSION_ID] = reaper.sessionId;
        const network = await client.network.create({
            Name: name,
            CheckDuplicate: true,
            Driver: "bridge",
            Internal: false,
            Attachable: false,
            Ingress: false,
            EnableIPv6: false,
            Labels: labels,
        });
        common_1.log.info(`Started network "${name}" with ID "${network.id}"`);
        return new StartedNetwork(client, name, network);
    }
}
exports.Network = Network;
class StartedNetwork {
    client;
    name;
    network;
    constructor(client, name, network) {
        this.client = client;
        this.name = name;
        this.network = network;
    }
    getId() {
        return this.network.id;
    }
    getName() {
        return this.name;
    }
    async stop() {
        common_1.log.info(`Stopping network with ID "${this.network.id}"...`);
        await this.client.network.remove(this.network);
        common_1.log.info(`Stopped network with ID "${this.network.id}"`);
        return new StoppedNetwork();
    }
    async [Symbol.asyncDispose]() {
        await this.stop();
    }
}
exports.StartedNetwork = StartedNetwork;
class StoppedNetwork {
}
exports.StoppedNetwork = StoppedNetwork;
//# sourceMappingURL=network.js.map