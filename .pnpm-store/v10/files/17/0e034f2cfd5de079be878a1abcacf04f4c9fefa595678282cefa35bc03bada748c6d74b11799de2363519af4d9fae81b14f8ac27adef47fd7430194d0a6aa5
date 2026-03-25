"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuthConfig = void 0;
const fs_1 = require("fs");
const promises_1 = require("fs/promises");
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const common_1 = require("../../common");
const auths_1 = require("./auths");
const cred_helpers_1 = require("./cred-helpers");
const creds_store_1 = require("./creds-store");
const dockerConfigLocation = process.env.DOCKER_CONFIG || `${os_1.default.homedir()}/.docker`;
const dockerConfigFile = path_1.default.resolve(dockerConfigLocation, "config.json");
const readDockerConfig = async () => {
    if (process.env.DOCKER_AUTH_CONFIG) {
        return parseDockerConfig(process.env.DOCKER_AUTH_CONFIG);
    }
    else if ((0, fs_1.existsSync)(dockerConfigFile)) {
        return parseDockerConfig((await (0, promises_1.readFile)(dockerConfigFile)).toString());
    }
    else {
        return Promise.resolve({});
    }
};
function parseDockerConfig(dockerConfig) {
    const object = JSON.parse(dockerConfig);
    return {
        credsStore: object.credsStore,
        credHelpers: object.credHelpers,
        auths: object.auths,
    };
}
const dockerConfig = readDockerConfig();
const registryAuthLocators = [new cred_helpers_1.CredHelpers(), new creds_store_1.CredsStore(), new auths_1.Auths()];
const authsCache = new Map();
const getAuthConfig = async (registry) => {
    if (authsCache.has(registry)) {
        common_1.log.debug(`Auth config cache hit for registry "${registry}"`);
        return authsCache.get(registry);
    }
    for (const registryAuthLocator of registryAuthLocators) {
        const authConfig = await registryAuthLocator.getAuthConfig(registry, await dockerConfig);
        if (authConfig) {
            common_1.log.debug(`Auth config found for registry "${registry}": ${registryAuthLocator.getName()}`);
            authsCache.set(registry, authConfig);
            return authConfig;
        }
    }
    common_1.log.debug(`No auth config found for registry "${registry}"`);
    authsCache.set(registry, undefined);
    return undefined;
};
exports.getAuthConfig = getAuthConfig;
//# sourceMappingURL=get-auth-config.js.map