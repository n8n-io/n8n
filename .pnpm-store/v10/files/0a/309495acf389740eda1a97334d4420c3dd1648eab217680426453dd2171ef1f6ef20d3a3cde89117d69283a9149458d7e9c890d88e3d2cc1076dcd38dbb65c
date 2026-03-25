"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getComposeClient = getComposeClient;
const docker_compose_1 = __importDefault(require("docker-compose"));
const common_1 = require("../../../common");
const default_compose_options_1 = require("./default-compose-options");
async function getComposeClient(environment) {
    try {
        return new DockerComposeClient(environment);
    }
    catch (err) {
        return new MissingComposeClient();
    }
}
class DockerComposeClient {
    environment;
    constructor(environment) {
        this.environment = environment;
    }
    async up(options, services) {
        try {
            if (services) {
                common_1.log.info(`Upping Compose environment services ${services.join(", ")}...`);
                await docker_compose_1.default.upMany(services, (0, default_compose_options_1.defaultComposeOptions)(this.environment, options));
            }
            else {
                common_1.log.info(`Upping Compose environment...`);
                await docker_compose_1.default.upAll((0, default_compose_options_1.defaultComposeOptions)(this.environment, options));
            }
            common_1.log.info(`Upped Compose environment`);
        }
        catch (err) {
            await handleAndRethrow(err, async (error) => {
                try {
                    common_1.log.error(`Failed to up Compose environment: ${error.message}`);
                    await this.down(options, { removeVolumes: true, timeout: 0 });
                }
                catch {
                    common_1.log.error(`Failed to down Compose environment after failed up`);
                }
            });
        }
    }
    async pull(options, services) {
        try {
            if (services) {
                common_1.log.info(`Pulling Compose environment images "${services.join('", "')}"...`);
                await docker_compose_1.default.pullMany(services, (0, default_compose_options_1.defaultComposeOptions)(this.environment, { ...options, logger: common_1.pullLog }));
            }
            else {
                common_1.log.info(`Pulling Compose environment images...`);
                await docker_compose_1.default.pullAll((0, default_compose_options_1.defaultComposeOptions)(this.environment, { ...options, logger: common_1.pullLog }));
            }
            common_1.log.info(`Pulled Compose environment`);
        }
        catch (err) {
            await handleAndRethrow(err, async (error) => common_1.log.error(`Failed to pull Compose environment images: ${error.message}`));
        }
    }
    async stop(options) {
        try {
            common_1.log.info(`Stopping Compose environment...`);
            await docker_compose_1.default.stop((0, default_compose_options_1.defaultComposeOptions)(this.environment, options));
            common_1.log.info(`Stopped Compose environment`);
        }
        catch (err) {
            await handleAndRethrow(err, async (error) => common_1.log.error(`Failed to stop Compose environment: ${error.message}`));
        }
    }
    async down(options, downOptions) {
        try {
            common_1.log.info(`Downing Compose environment...`);
            await docker_compose_1.default.down({
                ...(0, default_compose_options_1.defaultComposeOptions)(this.environment, options),
                commandOptions: composeDownCommandOptions(downOptions),
            });
            common_1.log.info(`Downed Compose environment`);
        }
        catch (err) {
            await handleAndRethrow(err, async (error) => common_1.log.error(`Failed to down Compose environment: ${error.message}`));
        }
    }
}
class MissingComposeClient {
    constructor() { }
    up() {
        throw new Error("Compose is not installed");
    }
    pull() {
        throw new Error("Compose is not installed");
    }
    stop() {
        throw new Error("Compose is not installed");
    }
    down() {
        throw new Error("Compose is not installed");
    }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleAndRethrow(err, handle) {
    const error = err instanceof Error ? err : new Error(err.err.trim());
    await handle(error);
    throw error;
}
function composeDownCommandOptions(options) {
    const result = [];
    if (options.removeVolumes) {
        result.push("-v");
    }
    if (options.timeout) {
        result.push("-t", `${(0, common_1.toSeconds)(options.timeout)}`);
    }
    return result;
}
//# sourceMappingURL=compose-client.js.map