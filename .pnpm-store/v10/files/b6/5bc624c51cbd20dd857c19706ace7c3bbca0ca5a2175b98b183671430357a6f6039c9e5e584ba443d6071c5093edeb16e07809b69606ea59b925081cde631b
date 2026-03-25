"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitForContainer = void 0;
const common_1 = require("../common");
const waitForContainer = async (client, container, waitStrategy, boundPorts, startTime) => {
    common_1.log.debug(`Waiting for container to be ready...`, { containerId: container.id });
    try {
        await waitStrategy.waitUntilReady(container, boundPorts, startTime);
        common_1.log.info(`Container is ready`, { containerId: container.id });
    }
    catch (err) {
        common_1.log.error(`Container failed to be ready: ${err}`, { containerId: container.id });
        try {
            await client.container.stop(container, { timeout: 0 });
            await client.container.remove(container, { removeVolumes: true });
        }
        catch (stopErr) {
            common_1.log.error(`Failed to stop container after it failed to be ready: ${stopErr}`, { containerId: container.id });
        }
        throw err;
    }
};
exports.waitForContainer = waitForContainer;
//# sourceMappingURL=wait-for-container.js.map