"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShellWaitStrategy = void 0;
const common_1 = require("../common");
const container_runtime_1 = require("../container-runtime");
const wait_strategy_1 = require("./wait-strategy");
class ShellWaitStrategy extends wait_strategy_1.AbstractWaitStrategy {
    command;
    constructor(command) {
        super();
        this.command = command;
    }
    async waitUntilReady(container) {
        common_1.log.debug(`Waiting for successful shell command "${this.command}"...`, { containerId: container.id });
        const client = await (0, container_runtime_1.getContainerRuntimeClient)();
        await new common_1.IntervalRetry(100).retryUntil(async () => {
            const { exitCode } = await client.container.exec(container, ["/bin/sh", "-c", this.command], {
                log: false,
            });
            return exitCode;
        }, (exitCode) => exitCode === 0, () => {
            const message = `Shell command "${this.command}" not successful after ${this.startupTimeoutMs}ms`;
            common_1.log.error(message, { containerId: container.id });
            throw new Error(message);
        }, this.startupTimeoutMs);
        common_1.log.debug(`Shell wait strategy complete`, { containerId: container.id });
    }
}
exports.ShellWaitStrategy = ShellWaitStrategy;
//# sourceMappingURL=shell-wait-strategy.js.map