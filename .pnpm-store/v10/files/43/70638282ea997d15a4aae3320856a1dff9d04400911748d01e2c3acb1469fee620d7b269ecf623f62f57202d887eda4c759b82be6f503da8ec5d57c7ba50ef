"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DockerContainerClient = void 0;
const stream_1 = require("stream");
const common_1 = require("../../../common");
class DockerContainerClient {
    dockerode;
    constructor(dockerode) {
        this.dockerode = dockerode;
    }
    getById(id) {
        try {
            common_1.log.debug(`Getting container by ID...`, { containerId: id });
            const container = this.dockerode.getContainer(id);
            common_1.log.debug(`Got container by ID`, { containerId: id });
            return container;
        }
        catch (err) {
            common_1.log.error(`Failed to get container by ID: ${err}`, { containerId: id });
            throw err;
        }
    }
    async fetchByLabel(labelName, labelValue, opts = undefined) {
        try {
            const filters = {
                label: [`${labelName}=${labelValue}`],
            };
            if (opts?.status) {
                filters.status = opts.status;
            }
            common_1.log.debug(`Fetching container by label "${labelName}=${labelValue}"...`);
            const containers = await this.dockerode.listContainers({
                limit: 1,
                filters,
            });
            if (containers.length === 0) {
                common_1.log.debug(`No container found with label "${labelName}=${labelValue}"`);
                return undefined;
            }
            else {
                common_1.log.debug(`Fetched container by label "${labelName}=${labelValue}"`);
                return this.getById(containers[0].Id);
            }
        }
        catch (err) {
            common_1.log.error(`Failed to fetch container by label "${labelName}=${labelValue}": ${err}`);
            throw err;
        }
    }
    async fetchArchive(container, path) {
        try {
            common_1.log.debug(`Fetching archive from container...`, { containerId: container.id });
            const archive = await container.getArchive({ path });
            common_1.log.debug(`Fetched archive from container`, { containerId: container.id });
            return archive;
        }
        catch (err) {
            common_1.log.error(`Failed to fetch archive from container: ${err}`, { containerId: container.id });
            throw err;
        }
    }
    async putArchive(container, stream, path) {
        try {
            common_1.log.debug(`Putting archive to container...`, { containerId: container.id });
            await (0, common_1.streamToString)(stream_1.Readable.from(await container.putArchive(stream, { path })));
            common_1.log.debug(`Put archive to container`, { containerId: container.id });
        }
        catch (err) {
            common_1.log.error(`Failed to put archive to container: ${err}`, { containerId: container.id });
            throw err;
        }
    }
    async list() {
        try {
            common_1.log.debug(`Listing containers...`);
            const containers = await this.dockerode.listContainers();
            common_1.log.debug(`Listed containers`);
            return containers;
        }
        catch (err) {
            common_1.log.error(`Failed to list containers: ${err}`);
            throw err;
        }
    }
    async create(opts) {
        try {
            common_1.log.debug(`Creating container for image "${opts.Image}"...`);
            const container = await this.dockerode.createContainer(opts);
            common_1.log.debug(`Created container for image "${opts.Image}"`, { containerId: container.id });
            return container;
        }
        catch (err) {
            common_1.log.error(`Failed to create container for image "${opts.Image}": ${err}`);
            throw err;
        }
    }
    async start(container) {
        try {
            common_1.log.debug(`Starting container...`, { containerId: container.id });
            await container.start();
            common_1.log.debug(`Started container`, { containerId: container.id });
        }
        catch (err) {
            common_1.log.error(`Failed to start container: ${err}`, { containerId: container.id });
            throw err;
        }
    }
    async inspect(container) {
        try {
            return await container.inspect();
        }
        catch (err) {
            common_1.log.error(`Failed to inspect container: ${err}`, { containerId: container.id });
            throw err;
        }
    }
    async stop(container, opts) {
        try {
            common_1.log.debug(`Stopping container...`, { containerId: container.id });
            await container.stop({ t: (0, common_1.toSeconds)(opts?.timeout ?? 0) });
            common_1.log.debug(`Stopped container`, { containerId: container.id });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }
        catch (err) {
            if (err.statusCode === 304) {
                common_1.log.debug(`Container already stopped`, { containerId: container.id });
            }
            else {
                common_1.log.error(`Failed to stop container: ${err}`, { containerId: container.id });
                throw err;
            }
        }
    }
    async attach(container) {
        try {
            common_1.log.debug(`Attaching to container...`, { containerId: container.id });
            const stream = (await container.attach({
                stream: true,
                stdout: true,
                stderr: true,
            }));
            const demuxedStream = this.demuxStream(container.id, stream);
            common_1.log.debug(`Attached to container`, { containerId: container.id });
            return demuxedStream;
        }
        catch (err) {
            common_1.log.error(`Failed to attach to container: ${err}`, { containerId: container.id });
            throw err;
        }
    }
    logs(container, opts) {
        common_1.log.debug(`Fetching container logs...`, { containerId: container.id });
        const proxyStream = new stream_1.PassThrough();
        proxyStream.setEncoding("utf8");
        container
            .logs({
            follow: true,
            stdout: true,
            stderr: true,
            tail: opts?.tail ?? -1,
            since: opts?.since ?? 0,
        })
            .then(async (stream) => {
            const actualLogStream = stream;
            actualLogStream.socket?.unref();
            const demuxedStream = await this.demuxStream(container.id, actualLogStream);
            demuxedStream.pipe(proxyStream);
            demuxedStream.on("error", (err) => proxyStream.emit("error", err));
            demuxedStream.on("end", () => proxyStream.end());
        })
            .catch((err) => {
            common_1.log.error(`Failed to fetch container logs: ${err}`, { containerId: container.id });
            proxyStream.end();
        });
        return Promise.resolve(proxyStream);
    }
    async exec(container, command, opts) {
        const execOptions = {
            Cmd: command,
            AttachStdout: true,
            AttachStderr: true,
        };
        if (opts?.env !== undefined) {
            execOptions.Env = Object.entries(opts.env).map(([key, value]) => `${key}=${value}`);
        }
        if (opts?.workingDir !== undefined) {
            execOptions.WorkingDir = opts.workingDir;
        }
        if (opts?.user !== undefined) {
            execOptions.User = opts.user;
        }
        const outputChunks = [];
        const stdoutChunks = [];
        const stderrChunks = [];
        try {
            if (opts?.log) {
                common_1.log.debug(`Execing container with command "${command.join(" ")}"...`, { containerId: container.id });
            }
            const exec = await container.exec(execOptions);
            const stream = await exec.start({ stdin: true, Detach: false, Tty: false });
            const stdoutStream = new stream_1.PassThrough();
            const stderrStream = new stream_1.PassThrough();
            this.dockerode.modem.demuxStream(stream, stdoutStream, stderrStream);
            const processStream = (stream, chunks) => {
                stream.on("data", (chunk) => {
                    chunks.push(chunk.toString());
                    outputChunks.push(chunk.toString());
                    if (opts?.log && common_1.execLog.enabled()) {
                        common_1.execLog.trace(chunk.toString(), { containerId: container.id });
                    }
                });
            };
            processStream(stdoutStream, stdoutChunks);
            processStream(stderrStream, stderrChunks);
            await new Promise((res, rej) => {
                stream.on("end", res);
                stream.on("error", rej);
            });
            stream.destroy();
            const inspectResult = await exec.inspect();
            const exitCode = inspectResult.ExitCode ?? -1;
            const output = outputChunks.join("");
            const stdout = stdoutChunks.join("");
            const stderr = stderrChunks.join("");
            if (opts?.log) {
                common_1.log.debug(`Execed container with command "${command.join(" ")}"...`, { containerId: container.id });
            }
            return { output, stdout, stderr, exitCode };
        }
        catch (err) {
            common_1.log.error(`Failed to exec container with command "${command.join(" ")}": ${err}: ${outputChunks.join("")}`, {
                containerId: container.id,
            });
            throw err;
        }
    }
    async restart(container, opts) {
        try {
            common_1.log.debug(`Restarting container...`, { containerId: container.id });
            await container.restart({ t: (0, common_1.toSeconds)(opts?.timeout ?? 0) });
            common_1.log.debug(`Restarted container`, { containerId: container.id });
        }
        catch (err) {
            common_1.log.error(`Failed to restart container: ${err}`, { containerId: container.id });
            throw err;
        }
    }
    async commit(container, opts) {
        try {
            common_1.log.debug(`Committing container...`, { containerId: container.id });
            const { Id: imageId } = await container.commit(opts);
            common_1.log.debug(`Committed container to image "${imageId}"`, { containerId: container.id });
            return imageId;
        }
        catch (err) {
            common_1.log.error(`Failed to commit container: ${err}`, { containerId: container.id });
            throw err;
        }
    }
    async remove(container, opts) {
        try {
            common_1.log.debug(`Removing container...`, { containerId: container.id });
            await container.remove({ v: opts?.removeVolumes });
            common_1.log.debug(`Removed container`, { containerId: container.id });
        }
        catch (err) {
            common_1.log.error(`Failed to remove container: ${err}`, { containerId: container.id });
            throw err;
        }
    }
    async events(container, eventNames) {
        common_1.log.debug(`Fetching event stream...`, { containerId: container.id });
        const stream = (await this.dockerode.getEvents({
            filters: {
                type: ["container"],
                container: [container.id],
                event: eventNames,
            },
        }));
        common_1.log.debug(`Fetched event stream...`, { containerId: container.id });
        return stream;
    }
    async demuxStream(containerId, stream) {
        try {
            common_1.log.debug(`Demuxing stream...`, { containerId });
            const demuxedStream = new stream_1.PassThrough({ autoDestroy: true, encoding: "utf-8" });
            this.dockerode.modem.demuxStream(stream, demuxedStream, demuxedStream);
            stream.on("end", () => demuxedStream.end());
            demuxedStream.on("close", () => {
                if (!stream.destroyed) {
                    stream.destroy();
                }
            });
            common_1.log.debug(`Demuxed stream`, { containerId });
            return demuxedStream;
        }
        catch (err) {
            common_1.log.error(`Failed to demux stream: ${err}`);
            throw err;
        }
    }
    async connectToNetwork(container, network, networkAliases) {
        try {
            common_1.log.debug(`Connecting to network "${network.id}"...`, { containerId: container.id });
            await network.connect({ Container: container.id, EndpointConfig: { Aliases: networkAliases } });
            common_1.log.debug(`Connected to network "${network.id}"...`, { containerId: container.id });
        }
        catch (err) {
            common_1.log.error(`Failed to connect to network "${network.id}": ${err}`, { containerId: container.id });
            throw err;
        }
    }
}
exports.DockerContainerClient = DockerContainerClient;
//# sourceMappingURL=docker-container-client.js.map