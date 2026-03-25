"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoppedGenericContainer = void 0;
const common_1 = require("../common");
const container_runtime_1 = require("../container-runtime");
class StoppedGenericContainer {
    container;
    constructor(container) {
        this.container = container;
    }
    getId() {
        return this.container.id;
    }
    async copyArchiveFromContainer(path) {
        common_1.log.debug(`Copying archive "${path}" from container...`, { containerId: this.container.id });
        const client = await (0, container_runtime_1.getContainerRuntimeClient)();
        const stream = await client.container.fetchArchive(this.container, path);
        common_1.log.debug(`Copied archive "${path}" from container`, { containerId: this.container.id });
        return stream;
    }
}
exports.StoppedGenericContainer = StoppedGenericContainer;
//# sourceMappingURL=stopped-generic-container.js.map