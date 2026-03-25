"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DockerComposeEnvironment = void 0;
const common_1 = require("../common");
const container_runtime_1 = require("../container-runtime");
const started_generic_container_1 = require("../generic-container/started-generic-container");
const reaper_1 = require("../reaper/reaper");
const bound_ports_1 = require("../utils/bound-ports");
const map_inspect_result_1 = require("../utils/map-inspect-result");
const pull_policy_1 = require("../utils/pull-policy");
const wait_1 = require("../wait-strategies/wait");
const wait_for_container_1 = require("../wait-strategies/wait-for-container");
const started_docker_compose_environment_1 = require("./started-docker-compose-environment");
class DockerComposeEnvironment {
    composeFilePath;
    composeFiles;
    projectName;
    build = false;
    recreate = true;
    environmentFile = "";
    profiles = [];
    environment = {};
    pullPolicy = pull_policy_1.PullPolicy.defaultPolicy();
    defaultWaitStrategy = wait_1.Wait.forListeningPorts();
    waitStrategy = {};
    startupTimeoutMs;
    clientOptions = {};
    constructor(composeFilePath, composeFiles, uuid = new common_1.RandomUuid()) {
        this.composeFilePath = composeFilePath;
        this.composeFiles = composeFiles;
        this.projectName = `testcontainers-${uuid.nextUuid()}`;
    }
    withBuild() {
        this.build = true;
        return this;
    }
    withEnvironment(environment) {
        this.environment = { ...this.environment, ...environment };
        return this;
    }
    withEnvironmentFile(environmentFile) {
        this.environmentFile = environmentFile;
        return this;
    }
    withProfiles(...profiles) {
        this.profiles = [...this.profiles, ...profiles];
        return this;
    }
    withNoRecreate() {
        this.recreate = false;
        this.projectName = "testcontainers-node";
        return this;
    }
    withPullPolicy(pullPolicy) {
        this.pullPolicy = pullPolicy;
        return this;
    }
    withDefaultWaitStrategy(waitStrategy) {
        this.defaultWaitStrategy = waitStrategy;
        return this;
    }
    withWaitStrategy(containerName, waitStrategy) {
        this.waitStrategy[containerName] = waitStrategy;
        return this;
    }
    withStartupTimeout(startupTimeoutMs) {
        this.startupTimeoutMs = startupTimeoutMs;
        return this;
    }
    withProjectName(projectName) {
        this.projectName = projectName;
        return this;
    }
    withClientOptions(options) {
        this.clientOptions = { ...this.clientOptions, ...options };
        return this;
    }
    async up(services) {
        common_1.log.info(`Starting DockerCompose environment "${this.projectName}"...`);
        const client = await (0, container_runtime_1.getContainerRuntimeClient)();
        const reaper = await (0, reaper_1.getReaper)(client);
        reaper.addComposeProject(this.projectName);
        const { composeOptions: clientComposeOptions = [], commandOptions: clientCommandOptions = [], ...remainingClientOptions } = this.clientOptions;
        const options = {
            ...remainingClientOptions,
            filePath: this.composeFilePath,
            files: this.composeFiles,
            projectName: this.projectName,
        };
        const commandOptions = [...clientCommandOptions];
        if (this.build) {
            commandOptions.push("--build");
        }
        if (!this.recreate) {
            commandOptions.push("--no-recreate");
        }
        const composeOptions = [...clientComposeOptions];
        if (this.environmentFile) {
            composeOptions.push("--env-file", this.environmentFile);
        }
        this.profiles.forEach((profile) => composeOptions.push("--profile", profile));
        if (this.pullPolicy.shouldPull()) {
            await client.compose.pull(options, services);
        }
        await client.compose.up({
            ...options,
            commandOptions,
            composeOptions,
            environment: { ...this.environment },
        }, services);
        const startedContainers = (await client.container.list()).filter((container) => container.Labels["com.docker.compose.project"] === this.projectName);
        const startedContainerNames = startedContainers.reduce((containerNames, startedContainer) => [
            ...containerNames,
            startedContainer.Names.join(", "),
        ], []);
        common_1.log.info(`Started containers "${startedContainerNames.join('", "')}"`);
        const startedGenericContainers = (await Promise.all(startedContainers.map(async (startedContainer) => {
            const container = client.container.getById(startedContainer.Id);
            const containerName = (0, container_runtime_1.parseComposeContainerName)(this.projectName, startedContainer.Names[0]);
            const inspectResult = await client.container.inspect(container);
            const mappedInspectResult = (0, map_inspect_result_1.mapInspectResult)(inspectResult);
            const boundPorts = bound_ports_1.BoundPorts.fromInspectResult(client.info.containerRuntime.hostIps, mappedInspectResult);
            const waitStrategy = this.waitStrategy[containerName]
                ? this.waitStrategy[containerName]
                : this.defaultWaitStrategy;
            if (this.startupTimeoutMs !== undefined) {
                waitStrategy.withStartupTimeout(this.startupTimeoutMs);
            }
            if (common_1.containerLog.enabled()) {
                (await client.container.logs(container))
                    .on("data", (data) => common_1.containerLog.trace(`${containerName}: ${data.trim()}`))
                    .on("err", (data) => common_1.containerLog.error(`${containerName}: ${data.trim()}`));
            }
            try {
                await (0, wait_for_container_1.waitForContainer)(client, container, waitStrategy, boundPorts);
            }
            catch (err) {
                try {
                    await client.compose.down(options, { removeVolumes: true, timeout: 0 });
                }
                catch {
                    common_1.log.warn(`Failed to stop DockerCompose environment after failed up`);
                }
                throw err;
            }
            return new started_generic_container_1.StartedGenericContainer(container, client.info.containerRuntime.host, inspectResult, boundPorts, containerName, waitStrategy, true);
        }))).reduce((map, startedGenericContainer) => {
            const containerName = startedGenericContainer.getName();
            return { ...map, [containerName]: startedGenericContainer };
        }, {});
        common_1.log.info(`DockerCompose environment started`);
        return new started_docker_compose_environment_1.StartedDockerComposeEnvironment(startedGenericContainers, {
            ...options,
            composeOptions,
            environment: this.environment,
        });
    }
}
exports.DockerComposeEnvironment = DockerComposeEnvironment;
//# sourceMappingURL=docker-compose-environment.js.map