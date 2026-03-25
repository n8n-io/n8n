"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompositeWaitStrategy = void 0;
const common_1 = require("../common");
const wait_strategy_1 = require("./wait-strategy");
class CompositeWaitStrategy extends wait_strategy_1.AbstractWaitStrategy {
    waitStrategies;
    deadline;
    constructor(waitStrategies) {
        super();
        this.waitStrategies = waitStrategies;
    }
    async waitUntilReady(container, boundPorts, startTime) {
        common_1.log.debug(`Waiting for composite...`, { containerId: container.id });
        return new Promise((resolve, reject) => {
            let deadlineTimeout;
            if (this.deadline !== undefined) {
                deadlineTimeout = setTimeout(() => {
                    const message = `Composite wait strategy not successful after ${this.deadline}ms`;
                    common_1.log.error(message, { containerId: container.id });
                    reject(new Error(message));
                }, this.deadline);
            }
            Promise.all(this.waitStrategies.map((waitStrategy) => waitStrategy.waitUntilReady(container, boundPorts, startTime)))
                .then(() => {
                common_1.log.debug(`Composite wait strategy complete`, { containerId: container.id });
                resolve();
            })
                .catch((err) => reject(err))
                .finally(() => {
                if (deadlineTimeout) {
                    clearTimeout(deadlineTimeout);
                }
            });
        });
    }
    withStartupTimeout(startupTimeoutMs) {
        this.waitStrategies
            .filter((waitStrategy) => !waitStrategy.isStartupTimeoutSet())
            .forEach((waitStrategy) => waitStrategy.withStartupTimeout(startupTimeoutMs));
        return this;
    }
    withDeadline(deadline) {
        this.deadline = deadline;
        return this;
    }
}
exports.CompositeWaitStrategy = CompositeWaitStrategy;
//# sourceMappingURL=composite-wait-strategy.js.map