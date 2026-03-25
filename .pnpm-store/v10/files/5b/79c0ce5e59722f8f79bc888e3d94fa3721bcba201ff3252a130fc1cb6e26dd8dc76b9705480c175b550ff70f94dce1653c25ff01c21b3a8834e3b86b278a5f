"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternalPortCheck = exports.HostPortCheck = void 0;
const net_1 = require("net");
const common_1 = require("../../common");
class HostPortCheck {
    client;
    constructor(client) {
        this.client = client;
    }
    isBound(port) {
        if (typeof port === "string" && port.toLowerCase().endsWith("/udp")) {
            common_1.log.debug(`Skipping host port check for UDP port ${port} (UDP port checks not supported)`);
            return Promise.resolve(true);
        }
        return new Promise((resolve) => {
            const socket = new net_1.Socket();
            const portNumber = typeof port === "string" ? parseInt(port.split("/")[0], 10) : port;
            socket
                .setTimeout(1000)
                .on("error", () => {
                socket.destroy();
                resolve(false);
            })
                .on("timeout", () => {
                socket.destroy();
                resolve(false);
            })
                .connect(portNumber, this.client.info.containerRuntime.host, () => {
                socket.end();
                resolve(true);
            });
        });
    }
}
exports.HostPortCheck = HostPortCheck;
class InternalPortCheck {
    client;
    container;
    isDistroless = false;
    commandOutputs = new Set();
    constructor(client, container) {
        this.client = client;
        this.container = container;
    }
    async isBound(port) {
        if (typeof port === "string" && port.toLowerCase().includes("/udp")) {
            common_1.log.debug(`Skipping internal port check for UDP port ${port} (UDP port checks not supported)`, {
                containerId: this.container.id,
            });
            return Promise.resolve(true);
        }
        const portNumber = typeof port === "string" ? parseInt(port.split("/")[0], 10) : port;
        const portHex = portNumber.toString(16).padStart(4, "0");
        const commands = [
            ["/bin/sh", "-c", `cat /proc/net/tcp* | awk '{print $2}' | grep -i :${portHex}`],
            ["/bin/sh", "-c", `nc -vz -w 1 localhost ${portNumber}`],
            ["/bin/bash", "-c", `</dev/tcp/localhost/${portNumber}`],
        ];
        const commandResults = await Promise.all(commands.map((command) => this.client.container.exec(this.container, command, { log: false })));
        const isBound = commandResults.some((result) => result.exitCode === 0);
        // https://www.gnu.org/software/bash/manual/html_node/Exit-Status.html
        // If a command is not found, the child process created to execute it returns a status of 127.
        // If a command is found but is not executable, the return status is 126.
        const shellExists = commandResults.some((result) => result.exitCode !== 126 && result.exitCode !== 127);
        if (!isBound && !shellExists && !this.isDistroless) {
            this.isDistroless = true;
            common_1.log.error(`The HostPortWaitStrategy will not work on a distroless image, use an alternate wait strategy`, {
                containerId: this.container.id,
            });
        }
        if (!isBound && common_1.log.enabled()) {
            commandResults
                .map((result) => ({ ...result, output: result.output.trim() }))
                .filter((result) => result.exitCode !== 126 && result.output.length > 0)
                .forEach((result) => {
                if (!this.commandOutputs.has(this.commandOutputsKey(result.output))) {
                    common_1.log.trace(`Port check result exit code ${result.exitCode}: ${result.output}`, {
                        containerId: this.container.id,
                    });
                    this.commandOutputs.add(this.commandOutputsKey(result.output));
                }
            });
        }
        return isBound;
    }
    commandOutputsKey(output) {
        return `${this.container.id}:${output}`;
    }
}
exports.InternalPortCheck = InternalPortCheck;
//# sourceMappingURL=port-check.js.map