"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DockerNetworkClient = void 0;
const common_1 = require("../../../common");
class DockerNetworkClient {
    dockerode;
    constructor(dockerode) {
        this.dockerode = dockerode;
    }
    getById(id) {
        try {
            common_1.log.debug(`Getting network by ID...`);
            const network = this.dockerode.getNetwork(id);
            common_1.log.debug(`Got network by ID`);
            return network;
        }
        catch (err) {
            common_1.log.error(`Failed to get network by ID: ${err}`);
            throw err;
        }
    }
    async create(opts) {
        try {
            common_1.log.debug(`Creating network "${opts.Name}"...`);
            const network = await this.dockerode.createNetwork(opts);
            common_1.log.debug(`Created network "${opts.Name}"`);
            return network;
        }
        catch (err) {
            common_1.log.error(`Failed to create network "${opts.Name}": ${err}`);
            throw err;
        }
    }
    async remove(network) {
        try {
            common_1.log.debug(`Removing network "${network.id}"...`);
            const { message } = await network.remove();
            if (message) {
                common_1.log.warn(`Message received when removing network "${network.id}": ${message}`);
            }
            common_1.log.debug(`Removed network "${network.id}"...`);
        }
        catch (err) {
            common_1.log.error(`Failed to remove network "${network.id}": ${err}`);
            throw err;
        }
    }
}
exports.DockerNetworkClient = DockerNetworkClient;
//# sourceMappingURL=docker-network-client.js.map