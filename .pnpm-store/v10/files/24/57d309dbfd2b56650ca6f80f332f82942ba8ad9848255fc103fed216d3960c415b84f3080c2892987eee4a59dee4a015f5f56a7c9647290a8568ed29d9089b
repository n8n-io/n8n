"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapInspectResult = mapInspectResult;
function mapInspectResult(inspectResult) {
    const finishedAt = new Date(inspectResult.State.FinishedAt);
    return {
        name: inspectResult.Name,
        hostname: inspectResult.Config.Hostname,
        ports: mapPorts(inspectResult),
        healthCheckStatus: mapHealthCheckStatus(inspectResult),
        networkSettings: mapNetworkSettings(inspectResult),
        state: {
            status: inspectResult.State.Status,
            running: inspectResult.State.Running,
            startedAt: new Date(inspectResult.State.StartedAt),
            finishedAt: finishedAt.getTime() < 0 ? undefined : finishedAt,
        },
        labels: inspectResult.Config.Labels,
    };
}
function mapPorts(inspectInfo) {
    return Object.entries(inspectInfo.NetworkSettings.Ports)
        .filter(([, hostPorts]) => hostPorts !== null)
        .map(([containerPortAndProtocol, hostPorts]) => {
        const [port, protocol] = containerPortAndProtocol.split("/");
        const containerPort = parseInt(port);
        return {
            [`${containerPort}/${protocol}`]: hostPorts.map((hostPort) => ({
                hostIp: hostPort.HostIp,
                hostPort: parseInt(hostPort.HostPort),
            })),
        };
    })
        .reduce((acc, curr) => ({ ...acc, ...curr }), {});
}
function mapHealthCheckStatus(inspectResult) {
    const health = inspectResult.State.Health;
    if (health === undefined) {
        return "none";
    }
    else {
        return health.Status;
    }
}
function mapNetworkSettings(inspectResult) {
    return Object.entries(inspectResult.NetworkSettings.Networks)
        .map(([networkName, network]) => ({
        [networkName]: {
            networkId: network.NetworkID,
            ipAddress: network.IPAddress,
        },
    }))
        .reduce((prev, next) => ({ ...prev, ...next }), {});
}
//# sourceMappingURL=map-inspect-result.js.map