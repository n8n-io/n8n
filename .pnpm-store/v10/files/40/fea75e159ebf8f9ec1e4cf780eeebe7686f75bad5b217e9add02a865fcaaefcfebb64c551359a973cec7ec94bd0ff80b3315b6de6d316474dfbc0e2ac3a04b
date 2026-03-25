"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigurationStrategy = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const config_1 = require("./utils/config");
class ConfigurationStrategy {
    getName() {
        return "ConfigurationStrategy";
    }
    async getResult() {
        const { dockerHost, dockerTlsVerify, dockerCertPath } = await (0, config_1.getContainerRuntimeConfig)();
        if (!dockerHost) {
            return undefined;
        }
        const dockerOptions = {};
        const { pathname, hostname, port } = new url_1.URL(dockerHost);
        if (hostname !== "") {
            dockerOptions.host = hostname;
            dockerOptions.port = port;
        }
        else {
            dockerOptions.socketPath = pathname;
        }
        if (dockerTlsVerify === "1" && dockerCertPath !== undefined) {
            dockerOptions.ca = await promises_1.default.readFile(path_1.default.resolve(dockerCertPath, "ca.pem"));
            dockerOptions.cert = await promises_1.default.readFile(path_1.default.resolve(dockerCertPath, "cert.pem"));
            dockerOptions.key = await promises_1.default.readFile(path_1.default.resolve(dockerCertPath, "key.pem"));
        }
        return {
            uri: dockerHost,
            dockerOptions,
            composeEnvironment: {
                DOCKER_HOST: dockerHost,
                DOCKER_TLS_VERIFY: dockerTlsVerify,
                DOCKER_CERT_PATH: dockerCertPath,
            },
            allowUserOverrides: true,
        };
    }
}
exports.ConfigurationStrategy = ConfigurationStrategy;
//# sourceMappingURL=configuration-strategy.js.map