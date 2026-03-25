"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DockerImageClient = void 0;
const dockerignore_1 = __importDefault(require("@balena/dockerignore"));
const async_lock_1 = __importDefault(require("async-lock"));
const byline_1 = __importDefault(require("byline"));
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const tar_fs_1 = __importDefault(require("tar-fs"));
const common_1 = require("../../../common");
const get_auth_config_1 = require("../../auth/get-auth-config");
class DockerImageClient {
    dockerode;
    indexServerAddress;
    existingImages = new Set();
    imageExistsLock = new async_lock_1.default();
    constructor(dockerode, indexServerAddress) {
        this.dockerode = dockerode;
        this.indexServerAddress = indexServerAddress;
    }
    async build(context, opts) {
        try {
            common_1.log.debug(`Building image "${opts.t}" with context "${context}"...`);
            const isDockerIgnored = await this.createIsDockerIgnoredFunction(context);
            const tarStream = tar_fs_1.default.pack(context, {
                ignore: (aPath) => {
                    const relativePath = path_1.default.relative(context, aPath);
                    if (relativePath === opts.dockerfile) {
                        return false;
                    }
                    else {
                        return isDockerIgnored(relativePath);
                    }
                },
            });
            await new Promise((resolve) => {
                this.dockerode
                    .buildImage(tarStream, opts)
                    .then((stream) => (0, byline_1.default)(stream))
                    .then((stream) => {
                    stream.setEncoding("utf-8");
                    stream.on("data", (line) => {
                        if (common_1.buildLog.enabled()) {
                            common_1.buildLog.trace(line, { imageName: opts.t });
                        }
                    });
                    stream.on("end", () => resolve());
                });
            });
            common_1.log.debug(`Built image "${opts.t}" with context "${context}"`);
        }
        catch (err) {
            common_1.log.error(`Failed to build image: ${err}`);
            throw err;
        }
    }
    async createIsDockerIgnoredFunction(context) {
        const dockerIgnoreFilePath = path_1.default.join(context, ".dockerignore");
        if (!(0, fs_1.existsSync)(dockerIgnoreFilePath)) {
            return () => false;
        }
        const dockerIgnorePatterns = await fs_1.promises.readFile(dockerIgnoreFilePath, { encoding: "utf-8" });
        const instance = (0, dockerignore_1.default)({ ignorecase: false });
        instance.add(dockerIgnorePatterns);
        const filter = instance.createFilter();
        return (aPath) => !filter(aPath);
    }
    async inspect(imageName) {
        try {
            common_1.log.debug(`Inspecting image: "${imageName.string}"...`);
            const imageInfo = await this.dockerode.getImage(imageName.string).inspect();
            common_1.log.debug(`Inspected image: "${imageName.string}"`);
            return imageInfo;
        }
        catch (err) {
            common_1.log.debug(`Failed to inspect image "${imageName.string}"`);
            throw err;
        }
    }
    async exists(imageName) {
        return this.imageExistsLock.acquire(imageName.string, async () => {
            if (this.existingImages.has(imageName.string)) {
                return true;
            }
            try {
                common_1.log.debug(`Checking if image exists "${imageName.string}"...`);
                await this.dockerode.getImage(imageName.string).inspect();
                this.existingImages.add(imageName.string);
                common_1.log.debug(`Checked if image exists "${imageName.string}"`);
                return true;
            }
            catch (err) {
                if (err instanceof Error && err.message.toLowerCase().includes("no such image")) {
                    common_1.log.debug(`Checked if image exists "${imageName.string}"`);
                    return false;
                }
                common_1.log.debug(`Failed to check if image exists "${imageName.string}"`);
                throw err;
            }
        });
    }
    async pull(imageName, opts) {
        try {
            if (!opts?.force && (await this.exists(imageName))) {
                common_1.log.debug(`Image "${imageName.string}" already exists`);
                return;
            }
            common_1.log.debug(`Pulling image "${imageName.string}"...`);
            const authconfig = await (0, get_auth_config_1.getAuthConfig)(imageName.registry ?? this.indexServerAddress);
            const stream = await this.dockerode.pull(imageName.string, {
                authconfig,
                platform: opts?.platform,
            });
            await new Promise((resolve) => {
                (0, byline_1.default)(stream).on("data", (line) => {
                    if (common_1.pullLog.enabled()) {
                        common_1.pullLog.trace(line, { imageName: imageName.string });
                    }
                });
                stream.on("end", resolve);
            });
            common_1.log.debug(`Pulled image "${imageName.string}"`);
        }
        catch (err) {
            common_1.log.error(`Failed to pull image "${imageName.string}": ${err}`);
            throw err;
        }
    }
}
exports.DockerImageClient = DockerImageClient;
//# sourceMappingURL=docker-image-client.js.map