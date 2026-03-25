"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StartedDockerComposeEnvironment = void 0;
const common_1 = require("../common");
const container_runtime_1 = require("../container-runtime");
const downed_docker_compose_environment_1 = require("./downed-docker-compose-environment");
const stopped_docker_compose_environment_1 = require("./stopped-docker-compose-environment");
class StartedDockerComposeEnvironment {
    startedGenericContainers;
    options;
    constructor(startedGenericContainers, options) {
        this.startedGenericContainers = startedGenericContainers;
        this.options = options;
    }
    async stop() {
        const client = await (0, container_runtime_1.getContainerRuntimeClient)();
        await client.compose.stop(this.options);
        return new stopped_docker_compose_environment_1.StoppedDockerComposeEnvironment(this.options);
    }
    async down(options = {}) {
        const client = await (0, container_runtime_1.getContainerRuntimeClient)();
        const downOptions = { timeout: 0, removeVolumes: true, ...options };
        await client.compose.down(this.options, downOptions);
        return new downed_docker_compose_environment_1.DownedDockerComposeEnvironment();
    }
    getContainer(containerName) {
        const container = this.startedGenericContainers[containerName];
        if (!container) {
            const error = `Cannot get container "${containerName}" as it is not running`;
            common_1.log.error(error);
            throw new Error(error);
        }
        return container;
    }
    async [Symbol.asyncDispose]() {
        await this.down();
    }
}
exports.StartedDockerComposeEnvironment = StartedDockerComposeEnvironment;
//# sourceMappingURL=started-docker-compose-environment.js.map