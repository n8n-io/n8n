"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContainerRuntimeConfig = void 0;
const fs_1 = require("fs");
const promises_1 = require("fs/promises");
const os_1 = require("os");
const path_1 = __importDefault(require("path"));
const properties_reader_1 = __importDefault(require("properties-reader"));
const common_1 = require("../../../common");
let containerRuntimeConfig;
const getContainerRuntimeConfig = async (env = process.env) => {
    if (!containerRuntimeConfig) {
        containerRuntimeConfig = {
            ...(await loadFromFile()),
            ...loadFromEnv(env),
        };
        logDockerClientConfig(containerRuntimeConfig);
    }
    return containerRuntimeConfig;
};
exports.getContainerRuntimeConfig = getContainerRuntimeConfig;
async function loadFromFile() {
    const file = path_1.default.resolve((0, os_1.homedir)(), ".testcontainers.properties");
    const dockerClientConfig = {};
    if ((0, fs_1.existsSync)(file)) {
        common_1.log.debug(`Loading ".testcontainers.properties" file...`);
        const string = await (0, promises_1.readFile)(file, { encoding: "utf-8" });
        const properties = (0, properties_reader_1.default)("").read(string);
        const tcHost = properties.get("tc.host");
        if (tcHost !== null) {
            dockerClientConfig.tcHost = tcHost;
        }
        const dockerHost = properties.get("docker.host");
        if (dockerHost !== null) {
            dockerClientConfig.dockerHost = dockerHost;
        }
        const dockerTlsVerify = properties.get("docker.tls.verify");
        if (dockerTlsVerify !== null) {
            dockerClientConfig.dockerTlsVerify = `${dockerTlsVerify}`;
        }
        const dockerCertPath = properties.get("docker.cert.path");
        if (dockerCertPath !== null) {
            dockerClientConfig.dockerCertPath = dockerCertPath;
        }
        common_1.log.debug(`Loaded ".testcontainers.properties" file`);
    }
    return dockerClientConfig;
}
function loadFromEnv(env) {
    const dockerClientConfig = {};
    if (env["DOCKER_HOST"] !== undefined) {
        dockerClientConfig.dockerHost = env["DOCKER_HOST"];
    }
    if (env["DOCKER_TLS_VERIFY"] !== undefined) {
        dockerClientConfig.dockerTlsVerify = env["DOCKER_TLS_VERIFY"];
    }
    if (env["DOCKER_CERT_PATH"] !== undefined) {
        dockerClientConfig.dockerCertPath = env["DOCKER_CERT_PATH"];
    }
    return dockerClientConfig;
}
function logDockerClientConfig(config) {
    if (!common_1.log.enabled()) {
        return;
    }
    const configurations = Object.entries(config)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key}: "${value}"`);
    if (configurations.length > 0) {
        common_1.log.debug(`Found custom configuration: ${configurations.join(", ")}`);
    }
}
//# sourceMappingURL=config.js.map