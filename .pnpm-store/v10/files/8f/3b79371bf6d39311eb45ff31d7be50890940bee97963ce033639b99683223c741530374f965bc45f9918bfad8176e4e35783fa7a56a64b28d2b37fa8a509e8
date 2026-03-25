"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestcontainersHostStrategy = void 0;
const url_1 = require("url");
const config_1 = require("./utils/config");
class TestcontainersHostStrategy {
    getName() {
        return "TestcontainersHostStrategy";
    }
    async getResult() {
        const { tcHost } = await (0, config_1.getContainerRuntimeConfig)();
        if (!tcHost) {
            return;
        }
        const dockerOptions = {};
        const { hostname, port } = new url_1.URL(tcHost);
        dockerOptions.host = hostname;
        dockerOptions.port = port;
        return {
            uri: tcHost,
            dockerOptions,
            composeEnvironment: {
                DOCKER_HOST: tcHost,
            },
            allowUserOverrides: false,
        };
    }
}
exports.TestcontainersHostStrategy = TestcontainersHostStrategy;
//# sourceMappingURL=testcontainers-host-strategy.js.map