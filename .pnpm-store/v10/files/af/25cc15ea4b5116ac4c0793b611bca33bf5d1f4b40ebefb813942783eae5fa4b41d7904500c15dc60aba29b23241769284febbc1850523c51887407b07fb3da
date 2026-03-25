"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveHostPortBinding = exports.BoundPorts = void 0;
const net_1 = __importDefault(require("net"));
const port_1 = require("./port");
class BoundPorts {
    ports = new Map();
    getBinding(port, protocol = "tcp") {
        let key;
        if (typeof port === "string" && port.includes("/")) {
            const [portNumber, portProtocol] = port.split("/");
            key = `${portNumber}/${portProtocol.toLowerCase()}`;
        }
        else {
            key = `${port}/${protocol.toLowerCase()}`;
        }
        const binding = this.ports.get(key);
        if (!binding) {
            throw new Error(`No port binding found for :${key}`);
        }
        return binding;
    }
    getFirstBinding() {
        const firstBinding = this.ports.values().next().value;
        if (!firstBinding) {
            throw new Error("No port bindings found");
        }
        else {
            return firstBinding;
        }
    }
    setBinding(key, value, protocol = "tcp") {
        const normalizedProtocol = protocol.toLowerCase();
        if (typeof key === "string" && key.includes("/")) {
            const [portNumber, portProtocol] = key.split("/");
            const normalizedKey = `${portNumber}/${portProtocol.toLowerCase()}`;
            this.ports.set(normalizedKey, value);
        }
        else {
            const portKey = typeof key === "string" ? key : `${key}/${normalizedProtocol}`;
            this.ports.set(portKey, value);
        }
    }
    iterator() {
        return this.ports;
    }
    filter(ports) {
        const boundPorts = new BoundPorts();
        const containerPortsWithProtocol = new Map();
        ports.forEach((port) => {
            const containerPort = (0, port_1.getContainerPort)(port);
            const protocol = (0, port_1.getProtocol)(port);
            containerPortsWithProtocol.set(containerPort, protocol);
        });
        for (const [internalPortWithProtocol, hostPort] of this.iterator()) {
            const [internalPortStr, protocol] = internalPortWithProtocol.split("/");
            const internalPort = parseInt(internalPortStr, 10);
            if (containerPortsWithProtocol.has(internalPort) &&
                containerPortsWithProtocol.get(internalPort)?.toLowerCase() === protocol?.toLowerCase()) {
                boundPorts.setBinding(internalPortWithProtocol, hostPort);
            }
        }
        return boundPorts;
    }
    static fromInspectResult(hostIps, inspectResult) {
        const boundPorts = new BoundPorts();
        Object.entries(inspectResult.ports).forEach(([containerPortWithProtocol, hostBindings]) => {
            const hostPort = (0, exports.resolveHostPortBinding)(hostIps, hostBindings);
            boundPorts.setBinding(containerPortWithProtocol, hostPort);
        });
        return boundPorts;
    }
}
exports.BoundPorts = BoundPorts;
const resolveHostPortBinding = (hostIps, hostPortBindings) => {
    if (isDualStackIp(hostPortBindings)) {
        return hostPortBindings[0].hostPort;
    }
    for (const { family } of hostIps) {
        const hostPortBinding = hostPortBindings.find(({ hostIp }) => net_1.default.isIP(hostIp) === family);
        if (hostPortBinding !== undefined) {
            return hostPortBinding.hostPort;
        }
    }
    throw new Error("No host port found for host IP");
};
exports.resolveHostPortBinding = resolveHostPortBinding;
const isDualStackIp = (hostPortBindings) => hostPortBindings.length === 1 && hostPortBindings[0].hostIp === "";
//# sourceMappingURL=bound-ports.js.map