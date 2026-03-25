"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mapPorts = (ports) => {
    if (!ports) {
        return [];
    }
    return ports.split(',').map((untypedPort) => {
        const exposedFragments = untypedPort.trim().split('->');
        const [port, protocol] = exposedFragments.length === 1
            ? exposedFragments[0].split('/')
            : exposedFragments[1].split('/');
        const mapped = exposedFragments[0];
        const lastDoubleColon = mapped.lastIndexOf(':');
        if (lastDoubleColon === -1) {
            return {
                exposed: { port: Number(port), protocol }
            };
        }
        const address = mapped.substr(0, lastDoubleColon);
        const mappedPort = mapped.substr(lastDoubleColon + 1);
        return {
            exposed: { port: Number(port), protocol },
            mapped: { port: Number(mappedPort), address }
        };
    });
};
exports.default = mapPorts;
