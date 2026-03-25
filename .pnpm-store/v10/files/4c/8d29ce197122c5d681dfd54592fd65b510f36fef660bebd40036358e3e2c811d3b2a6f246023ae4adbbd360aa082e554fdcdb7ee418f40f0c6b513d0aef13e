"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoppedDockerComposeEnvironment = void 0;
const container_runtime_1 = require("../container-runtime");
const downed_docker_compose_environment_1 = require("./downed-docker-compose-environment");
class StoppedDockerComposeEnvironment {
    options;
    constructor(options) {
        this.options = options;
    }
    async down(options = {}) {
        const client = await (0, container_runtime_1.getContainerRuntimeClient)();
        const resolvedOptions = { timeout: 0, removeVolumes: true, ...options };
        await client.compose.down(this.options, resolvedOptions);
        return new downed_docker_compose_environment_1.DownedDockerComposeEnvironment();
    }
}
exports.StoppedDockerComposeEnvironment = StoppedDockerComposeEnvironment;
//# sourceMappingURL=stopped-docker-compose-environment.js.map