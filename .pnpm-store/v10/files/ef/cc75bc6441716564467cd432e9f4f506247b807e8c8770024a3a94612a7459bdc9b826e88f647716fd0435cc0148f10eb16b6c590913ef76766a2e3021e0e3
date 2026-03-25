"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestContainers = void 0;
const common_1 = require("./common");
const container_runtime_1 = require("./container-runtime");
const port_forwarder_1 = require("./port-forwarder/port-forwarder");
class TestContainers {
    static async exposeHostPorts(...ports) {
        const portForwarder = await port_forwarder_1.PortForwarderInstance.getInstance();
        await Promise.all(ports.map((port) => portForwarder.exposeHostPort(port).catch(async (err) => {
            if (await this.isHostPortExposed(portForwarder.getContainerId(), port)) {
                common_1.log.debug(`Host port ${port} is already exposed`);
            }
            else {
                throw err;
            }
        })));
    }
    static async isHostPortExposed(portForwarderContainerId, hostPort) {
        const client = await (0, container_runtime_1.getContainerRuntimeClient)();
        const container = client.container.getById(portForwarderContainerId);
        const { exitCode } = await client.container.exec(container, [
            "sh",
            "-c",
            `netstat -tl | grep ${hostPort} | grep LISTEN`,
        ]);
        return exitCode === 0;
    }
}
exports.TestContainers = TestContainers;
//# sourceMappingURL=test-containers.js.map