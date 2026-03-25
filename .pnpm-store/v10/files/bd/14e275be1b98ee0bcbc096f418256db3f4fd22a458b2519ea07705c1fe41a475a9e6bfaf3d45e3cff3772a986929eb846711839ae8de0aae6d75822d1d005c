"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogWaitStrategy = void 0;
const byline_1 = __importDefault(require("byline"));
const common_1 = require("../common");
const container_runtime_1 = require("../container-runtime");
const wait_strategy_1 = require("./wait-strategy");
class LogWaitStrategy extends wait_strategy_1.AbstractWaitStrategy {
    message;
    times;
    constructor(message, times) {
        super();
        this.message = message;
        this.times = times;
    }
    async waitUntilReady(container, boundPorts, startTime) {
        common_1.log.debug(`Waiting for log message "${this.message}"...`, { containerId: container.id });
        const client = await (0, container_runtime_1.getContainerRuntimeClient)();
        const stream = await client.container.logs(container, { since: startTime ? startTime.getTime() / 1000 : 0 });
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                const message = `Log message "${this.message}" not received after ${this.startupTimeoutMs}ms`;
                common_1.log.error(message, { containerId: container.id });
                reject(new Error(message));
            }, this.startupTimeoutMs);
            const comparisonFn = (line) => {
                if (this.message instanceof RegExp) {
                    return this.message.test(line);
                }
                else {
                    return line.includes(this.message);
                }
            };
            let count = 0;
            const lineProcessor = (line) => {
                if (comparisonFn(line)) {
                    if (++count === this.times) {
                        stream.destroy();
                        clearTimeout(timeout);
                        common_1.log.debug(`Log wait strategy complete`, { containerId: container.id });
                        resolve();
                    }
                }
            };
            (0, byline_1.default)(stream)
                .on("data", lineProcessor)
                .on("err", lineProcessor)
                .on("end", () => {
                stream.destroy();
                clearTimeout(timeout);
                const message = `Log stream ended and message "${this.message}" was not received`;
                common_1.log.error(message, { containerId: container.id });
                reject(new Error(message));
            });
        });
    }
}
exports.LogWaitStrategy = LogWaitStrategy;
//# sourceMappingURL=log-wait-strategy.js.map