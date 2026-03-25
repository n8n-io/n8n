"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StartupCheckStrategy = void 0;
const common_1 = require("../common");
const container_runtime_1 = require("../container-runtime");
const wait_strategy_1 = require("./wait-strategy");
class StartupCheckStrategy extends wait_strategy_1.AbstractWaitStrategy {
    constructor() {
        super();
    }
    async waitUntilReady(container) {
        const client = await (0, container_runtime_1.getContainerRuntimeClient)();
        const startupStatus = await new common_1.IntervalRetry(1000).retryUntil(async () => await this.checkStartupState(client.container.dockerode, container.id), (startupStatus) => startupStatus === "SUCCESS" || startupStatus === "FAIL", () => {
            const message = `Container not accessible after ${this.startupTimeoutMs}ms`;
            common_1.log.error(message, { containerId: container.id });
            return new Error(message);
        }, this.startupTimeoutMs);
        if (startupStatus instanceof Error) {
            throw startupStatus;
        }
        else if (startupStatus === "FAIL") {
            throw new Error(`Container failed to start for ${container.id}`);
        }
    }
}
exports.StartupCheckStrategy = StartupCheckStrategy;
//# sourceMappingURL=startup-check-strategy.js.map