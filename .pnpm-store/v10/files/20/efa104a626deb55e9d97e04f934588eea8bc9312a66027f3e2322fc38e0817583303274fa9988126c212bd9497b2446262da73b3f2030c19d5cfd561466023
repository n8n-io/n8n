"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StartedSocatContainer = exports.SocatContainer = void 0;
const common_1 = require("../common");
const abstract_started_container_1 = require("../generic-container/abstract-started-container");
const generic_container_1 = require("../generic-container/generic-container");
class SocatContainer extends generic_container_1.GenericContainer {
    targets = {};
    constructor(image = "alpine/socat:1.7.4.3-r0") {
        super(image);
        this.withEntrypoint(["/bin/sh"]);
        this.withName(`testcontainers-socat-${new common_1.RandomUuid().nextUuid()}`);
    }
    withTarget(exposePort, host, internalPort = exposePort) {
        this.withExposedPorts(exposePort);
        this.targets[exposePort] = `${host}:${internalPort}`;
        return this;
    }
    async start() {
        const command = Object.entries(this.targets)
            .map(([exposePort, target]) => `socat TCP-LISTEN:${exposePort},fork,reuseaddr TCP:${target}`)
            .join(" & ");
        this.withCommand(["-c", command]);
        return new StartedSocatContainer(await super.start());
    }
}
exports.SocatContainer = SocatContainer;
class StartedSocatContainer extends abstract_started_container_1.AbstractStartedContainer {
    constructor(startedTestcontainers) {
        super(startedTestcontainers);
    }
}
exports.StartedSocatContainer = StartedSocatContainer;
//# sourceMappingURL=socat-container.js.map