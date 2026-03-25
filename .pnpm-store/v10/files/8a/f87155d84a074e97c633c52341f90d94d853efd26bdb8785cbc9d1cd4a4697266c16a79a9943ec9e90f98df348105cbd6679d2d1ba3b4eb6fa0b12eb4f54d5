"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenericContainerBuilder = void 0;
const path_1 = __importDefault(require("path"));
const common_1 = require("../common");
const container_runtime_1 = require("../container-runtime");
const reaper_1 = require("../reaper/reaper");
const dockerfile_parser_1 = require("../utils/dockerfile-parser");
const labels_1 = require("../utils/labels");
const pull_policy_1 = require("../utils/pull-policy");
const generic_container_1 = require("./generic-container");
class GenericContainerBuilder {
    context;
    dockerfileName;
    uuid;
    buildArgs = {};
    pullPolicy = pull_policy_1.PullPolicy.defaultPolicy();
    cache = true;
    buildkit = false;
    target;
    platform;
    constructor(context, dockerfileName, uuid = new common_1.RandomUuid()) {
        this.context = context;
        this.dockerfileName = dockerfileName;
        this.uuid = uuid;
    }
    withBuildArgs(buildArgs) {
        this.buildArgs = buildArgs;
        return this;
    }
    withPullPolicy(pullPolicy) {
        this.pullPolicy = pullPolicy;
        return this;
    }
    withCache(cache) {
        this.cache = cache;
        return this;
    }
    withBuildkit() {
        this.buildkit = true;
        return this;
    }
    withPlatform(platform) {
        this.platform = platform;
        return this;
    }
    withTarget(target) {
        this.target = target;
        return this;
    }
    async build(image = `localhost/${this.uuid.nextUuid()}:${this.uuid.nextUuid()}`, options = { deleteOnExit: true }) {
        const client = await (0, container_runtime_1.getContainerRuntimeClient)();
        const reaper = await (0, reaper_1.getReaper)(client);
        const imageName = container_runtime_1.ImageName.fromString(image);
        const dockerfile = path_1.default.resolve(this.context, this.dockerfileName);
        const imageNames = await (0, dockerfile_parser_1.getDockerfileImages)(dockerfile, this.buildArgs);
        const registryConfig = await this.getRegistryConfig(client.info.containerRuntime.indexServerAddress, imageNames);
        const labels = (0, labels_1.createLabels)();
        if (options.deleteOnExit) {
            labels[labels_1.LABEL_TESTCONTAINERS_SESSION_ID] = reaper.sessionId;
        }
        common_1.log.info(`Building Dockerfile "${dockerfile}" as image "${imageName.string}"...`);
        const buildOptions = {
            t: imageName.string,
            dockerfile: this.dockerfileName,
            buildargs: this.buildArgs,
            nocache: !this.cache,
            // @ts-expect-error Dockerode types don't yet include identityToken
            registryconfig: registryConfig,
            labels,
            target: this.target,
            platform: this.platform,
            version: this.buildkit ? "2" : "1",
        };
        if (this.pullPolicy.shouldPull()) {
            buildOptions.pull = true;
        }
        await client.image.build(this.context, buildOptions);
        const container = new generic_container_1.GenericContainer(imageName.string);
        if (!(await client.image.exists(imageName))) {
            throw new Error("Failed to build image");
        }
        return Promise.resolve(container);
    }
    async getRegistryConfig(indexServerAddress, imageNames) {
        const authConfigs = [];
        await Promise.all(imageNames.map(async (imageName) => {
            const authConfig = await (0, container_runtime_1.getAuthConfig)(imageName.registry ?? indexServerAddress);
            if (authConfig !== undefined) {
                authConfigs.push(authConfig);
            }
        }));
        return authConfigs
            .map((authConfig) => ({ [authConfig.registryAddress]: authConfig }))
            .reduce((prev, next) => ({ ...prev, ...next }), {});
    }
}
exports.GenericContainerBuilder = GenericContainerBuilder;
//# sourceMappingURL=generic-container-builder.js.map