"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inspectContainerUntilPortsExposed = inspectContainerUntilPortsExposed;
const common_1 = require("../common");
async function inspectContainerUntilPortsExposed(inspectFn, containerId, timeout = 10_000) {
    const result = await new common_1.IntervalRetry(250).retryUntil(() => inspectFn(), (inspectResult) => {
        const portBindings = inspectResult?.HostConfig?.PortBindings;
        if (!portBindings)
            return true;
        const expectedlyBoundPorts = Object.keys(portBindings);
        return expectedlyBoundPorts.every((exposedPort) => inspectResult.NetworkSettings.Ports[exposedPort]?.length > 0);
    }, () => {
        const message = `Timed out after ${timeout}ms while waiting for container ports to be bound to the host`;
        common_1.log.error(message, { containerId });
        return new Error(message);
    }, timeout);
    if (result instanceof Error) {
        throw result;
    }
    return result;
}
//# sourceMappingURL=inspect-container-util-ports-exposed.js.map