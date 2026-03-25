"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HostPortWaitStrategy = void 0;
const common_1 = require("../common");
const container_runtime_1 = require("../container-runtime");
const port_check_1 = require("./utils/port-check");
const wait_strategy_1 = require("./wait-strategy");
class HostPortWaitStrategy extends wait_strategy_1.AbstractWaitStrategy {
    async waitUntilReady(container, boundPorts) {
        const client = await (0, container_runtime_1.getContainerRuntimeClient)();
        const hostPortCheck = new port_check_1.HostPortCheck(client);
        const internalPortCheck = new port_check_1.InternalPortCheck(client, container);
        await Promise.all([
            this.waitForHostPorts(hostPortCheck, container, boundPorts),
            this.waitForInternalPorts(internalPortCheck, container, boundPorts),
        ]);
    }
    async waitForHostPorts(portCheck, container, boundPorts) {
        for (const [portKey, hostPort] of boundPorts.iterator()) {
            if (portKey.toLowerCase().endsWith("/udp")) {
                common_1.log.debug(`Skipping wait for host port ${hostPort} (mapped from UDP port ${portKey})`, {
                    containerId: container.id,
                });
                continue;
            }
            common_1.log.debug(`Waiting for host port ${hostPort}...`, { containerId: container.id });
            await this.waitForPort(container, hostPort, portCheck);
            common_1.log.debug(`Host port ${hostPort} ready`, { containerId: container.id });
        }
        common_1.log.debug(`Host port wait strategy complete`, { containerId: container.id });
    }
    async waitForInternalPorts(portCheck, container, boundPorts) {
        for (const [internalPort] of boundPorts.iterator()) {
            if (internalPort.toLowerCase().endsWith("/udp")) {
                common_1.log.debug(`Skipping wait for internal UDP port ${internalPort}`, {
                    containerId: container.id,
                });
                continue;
            }
            common_1.log.debug(`Waiting for internal port ${internalPort}...`, { containerId: container.id });
            await this.waitForPort(container, internalPort, portCheck);
            common_1.log.debug(`Internal port ${internalPort} ready`, { containerId: container.id });
        }
        common_1.log.debug(`Internal port wait strategy complete`, { containerId: container.id });
    }
    async waitForPort(container, port, portCheck) {
        await new common_1.IntervalRetry(100).retryUntil(() => portCheck.isBound(port), (isBound) => isBound, () => {
            const message = `Port ${port} not bound after ${this.startupTimeoutMs}ms`;
            common_1.log.error(message, { containerId: container.id });
            throw new Error(message);
        }, this.startupTimeoutMs);
    }
}
exports.HostPortWaitStrategy = HostPortWaitStrategy;
//# sourceMappingURL=host-port-wait-strategy.js.map