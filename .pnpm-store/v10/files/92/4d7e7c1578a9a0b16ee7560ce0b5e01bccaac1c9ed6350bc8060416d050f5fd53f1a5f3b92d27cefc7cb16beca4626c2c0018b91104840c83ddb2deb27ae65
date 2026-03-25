"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthCheckWaitStrategy = void 0;
const common_1 = require("../common");
const container_runtime_1 = require("../container-runtime");
const wait_strategy_1 = require("./wait-strategy");
class HealthCheckWaitStrategy extends wait_strategy_1.AbstractWaitStrategy {
    async waitUntilReady(container) {
        common_1.log.debug(`Waiting for health check...`, { containerId: container.id });
        const client = await (0, container_runtime_1.getContainerRuntimeClient)();
        const status = await new common_1.IntervalRetry(100).retryUntil(async () => (await client.container.inspect(container)).State.Health?.Status, (healthCheckStatus) => healthCheckStatus === "healthy" || healthCheckStatus === "unhealthy", () => {
            const timeout = this.startupTimeoutMs;
            const message = `Health check not healthy after ${timeout}ms`;
            common_1.log.error(message, { containerId: container.id });
            throw new Error(message);
        }, this.startupTimeoutMs);
        if (status !== "healthy") {
            const message = `Health check failed: ${status}`;
            common_1.log.error(message, { containerId: container.id });
            throw new Error(message);
        }
        common_1.log.debug(`Health check wait strategy complete`, { containerId: container.id });
    }
}
exports.HealthCheckWaitStrategy = HealthCheckWaitStrategy;
//# sourceMappingURL=health-check-wait-strategy.js.map