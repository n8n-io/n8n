"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpWaitStrategy = void 0;
const undici_1 = require("undici");
const common_1 = require("../common");
const container_runtime_1 = require("../container-runtime");
const undici_response_parser_1 = require("./utils/undici-response-parser");
const wait_strategy_1 = require("./wait-strategy");
class HttpWaitStrategy extends wait_strategy_1.AbstractWaitStrategy {
    path;
    port;
    options;
    protocol = "http";
    method = "GET";
    headers = {};
    predicates = [];
    _allowInsecure = false;
    readTimeoutMs = 1000;
    constructor(path, port, options) {
        super();
        this.path = path;
        this.port = port;
        this.options = options;
    }
    forStatusCode(statusCode) {
        this.predicates.push(async (response) => response.status === statusCode);
        return this;
    }
    forStatusCodeMatching(predicate) {
        this.predicates.push(async (response) => predicate(response.status));
        return this;
    }
    forResponsePredicate(predicate) {
        this.predicates.push(async (response) => predicate(await response.text()));
        return this;
    }
    withMethod(method) {
        this.method = method;
        return this;
    }
    withHeaders(headers) {
        this.headers = { ...this.headers, ...headers };
        return this;
    }
    withBasicCredentials(username, password) {
        const base64Encoded = Buffer.from(`${username}:${password}`).toString("base64");
        this.headers = { ...this.headers, Authorization: `Basic ${base64Encoded}` };
        return this;
    }
    withReadTimeout(startupTimeoutMs) {
        this.readTimeoutMs = startupTimeoutMs;
        return this;
    }
    usingTls() {
        this.protocol = "https";
        return this;
    }
    allowInsecure() {
        this._allowInsecure = true;
        return this;
    }
    async waitUntilReady(container, boundPorts) {
        common_1.log.debug(`Waiting for HTTP...`, { containerId: container.id });
        const exitStatus = "exited";
        let containerExited = false;
        const client = await (0, container_runtime_1.getContainerRuntimeClient)();
        const { abortOnContainerExit } = this.options;
        await new common_1.IntervalRetry(this.readTimeoutMs).retryUntil(async () => {
            try {
                const url = `${this.protocol}://${client.info.containerRuntime.host}:${boundPorts.getBinding(this.port)}${this.path}`;
                if (abortOnContainerExit) {
                    const containerStatus = (await client.container.inspect(container)).State.Status;
                    if (containerStatus === exitStatus) {
                        containerExited = true;
                        return;
                    }
                }
                return (0, undici_response_parser_1.undiciResponseToFetchResponse)(await (0, undici_1.request)(url, {
                    method: this.method,
                    signal: AbortSignal.timeout(this.readTimeoutMs),
                    headers: this.headers,
                    dispatcher: this.getAgent(),
                }));
            }
            catch {
                return undefined;
            }
        }, async (response) => {
            if (abortOnContainerExit && containerExited) {
                return true;
            }
            if (response === undefined) {
                return false;
            }
            else if (!this.predicates.length) {
                return response.ok;
            }
            else {
                for (const predicate of this.predicates) {
                    const result = await predicate(response);
                    if (!result) {
                        return false;
                    }
                }
                return true;
            }
        }, () => {
            const message = `URL ${this.path} not accessible after ${this.startupTimeoutMs}ms`;
            common_1.log.error(message, { containerId: container.id });
            throw new Error(message);
        }, this.startupTimeoutMs);
        if (abortOnContainerExit && containerExited) {
            return this.handleContainerExit(container);
        }
        common_1.log.debug(`HTTP wait strategy complete`, { containerId: container.id });
    }
    async handleContainerExit(container) {
        const tail = 50;
        const lastLogs = [];
        const client = await (0, container_runtime_1.getContainerRuntimeClient)();
        let message;
        try {
            const stream = await client.container.logs(container, { tail });
            await new Promise((res) => {
                stream.on("data", (d) => lastLogs.push(d.trim())).on("end", res);
            });
            message = `Container exited during HTTP healthCheck, last ${tail} logs: ${lastLogs.join("\n")}`;
        }
        catch (err) {
            message = "Container exited during HTTP healthCheck, failed to get last logs";
        }
        common_1.log.error(message, { containerId: container.id });
        throw new Error(message);
    }
    getAgent() {
        if (this._allowInsecure) {
            return new undici_1.Agent({
                connect: {
                    rejectUnauthorized: false,
                },
            });
        }
    }
}
exports.HttpWaitStrategy = HttpWaitStrategy;
//# sourceMappingURL=http-wait-strategy.js.map