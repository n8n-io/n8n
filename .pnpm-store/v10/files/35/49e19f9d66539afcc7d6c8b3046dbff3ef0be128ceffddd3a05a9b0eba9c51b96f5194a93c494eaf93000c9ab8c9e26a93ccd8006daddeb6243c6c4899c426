"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SentinelIterator = void 0;
const net_1 = require("net");
const utils_1 = require("../../utils");
const tls_1 = require("tls");
const SentinelIterator_1 = require("./SentinelIterator");
exports.SentinelIterator = SentinelIterator_1.default;
const AbstractConnector_1 = require("../AbstractConnector");
const Redis_1 = require("../../Redis");
const FailoverDetector_1 = require("./FailoverDetector");
const debug = (0, utils_1.Debug)("SentinelConnector");
class SentinelConnector extends AbstractConnector_1.default {
    constructor(options) {
        super(options.disconnectTimeout);
        this.options = options;
        this.emitter = null;
        this.failoverDetector = null;
        if (!this.options.sentinels.length) {
            throw new Error("Requires at least one sentinel to connect to.");
        }
        if (!this.options.name) {
            throw new Error("Requires the name of master.");
        }
        this.sentinelIterator = new SentinelIterator_1.default(this.options.sentinels);
    }
    check(info) {
        const roleMatches = !info.role || this.options.role === info.role;
        if (!roleMatches) {
            debug("role invalid, expected %s, but got %s", this.options.role, info.role);
            // Start from the next item.
            // Note that `reset` will move the cursor to the previous element,
            // so we advance two steps here.
            this.sentinelIterator.next();
            this.sentinelIterator.next();
            this.sentinelIterator.reset(true);
        }
        return roleMatches;
    }
    disconnect() {
        super.disconnect();
        if (this.failoverDetector) {
            this.failoverDetector.cleanup();
        }
    }
    connect(eventEmitter) {
        this.connecting = true;
        this.retryAttempts = 0;
        let lastError;
        const connectToNext = async () => {
            const endpoint = this.sentinelIterator.next();
            if (endpoint.done) {
                this.sentinelIterator.reset(false);
                const retryDelay = typeof this.options.sentinelRetryStrategy === "function"
                    ? this.options.sentinelRetryStrategy(++this.retryAttempts)
                    : null;
                let errorMsg = typeof retryDelay !== "number"
                    ? "All sentinels are unreachable and retry is disabled."
                    : `All sentinels are unreachable. Retrying from scratch after ${retryDelay}ms.`;
                if (lastError) {
                    errorMsg += ` Last error: ${lastError.message}`;
                }
                debug(errorMsg);
                const error = new Error(errorMsg);
                if (typeof retryDelay === "number") {
                    eventEmitter("error", error);
                    await new Promise((resolve) => setTimeout(resolve, retryDelay));
                    return connectToNext();
                }
                else {
                    throw error;
                }
            }
            let resolved = null;
            let err = null;
            try {
                resolved = await this.resolve(endpoint.value);
            }
            catch (error) {
                err = error;
            }
            if (!this.connecting) {
                throw new Error(utils_1.CONNECTION_CLOSED_ERROR_MSG);
            }
            const endpointAddress = endpoint.value.host + ":" + endpoint.value.port;
            if (resolved) {
                debug("resolved: %s:%s from sentinel %s", resolved.host, resolved.port, endpointAddress);
                if (this.options.enableTLSForSentinelMode && this.options.tls) {
                    Object.assign(resolved, this.options.tls);
                    this.stream = (0, tls_1.connect)(resolved);
                    this.stream.once("secureConnect", this.initFailoverDetector.bind(this));
                }
                else {
                    this.stream = (0, net_1.createConnection)(resolved);
                    this.stream.once("connect", this.initFailoverDetector.bind(this));
                }
                this.stream.once("error", (err) => {
                    this.firstError = err;
                });
                return this.stream;
            }
            else {
                const errorMsg = err
                    ? "failed to connect to sentinel " +
                        endpointAddress +
                        " because " +
                        err.message
                    : "connected to sentinel " +
                        endpointAddress +
                        " successfully, but got an invalid reply: " +
                        resolved;
                debug(errorMsg);
                eventEmitter("sentinelError", new Error(errorMsg));
                if (err) {
                    lastError = err;
                }
                return connectToNext();
            }
        };
        return connectToNext();
    }
    async updateSentinels(client) {
        if (!this.options.updateSentinels) {
            return;
        }
        const result = await client.sentinel("sentinels", this.options.name);
        if (!Array.isArray(result)) {
            return;
        }
        result
            .map(utils_1.packObject)
            .forEach((sentinel) => {
            const flags = sentinel.flags ? sentinel.flags.split(",") : [];
            if (flags.indexOf("disconnected") === -1 &&
                sentinel.ip &&
                sentinel.port) {
                const endpoint = this.sentinelNatResolve(addressResponseToAddress(sentinel));
                if (this.sentinelIterator.add(endpoint)) {
                    debug("adding sentinel %s:%s", endpoint.host, endpoint.port);
                }
            }
        });
        debug("Updated internal sentinels: %s", this.sentinelIterator);
    }
    async resolveMaster(client) {
        const result = await client.sentinel("get-master-addr-by-name", this.options.name);
        await this.updateSentinels(client);
        return this.sentinelNatResolve(Array.isArray(result)
            ? { host: result[0], port: Number(result[1]) }
            : null);
    }
    async resolveSlave(client) {
        const result = await client.sentinel("slaves", this.options.name);
        if (!Array.isArray(result)) {
            return null;
        }
        const availableSlaves = result
            .map(utils_1.packObject)
            .filter((slave) => slave.flags && !slave.flags.match(/(disconnected|s_down|o_down)/));
        return this.sentinelNatResolve(selectPreferredSentinel(availableSlaves, this.options.preferredSlaves));
    }
    sentinelNatResolve(item) {
        if (!item || !this.options.natMap)
            return item;
        return this.options.natMap[`${item.host}:${item.port}`] || item;
    }
    connectToSentinel(endpoint, options) {
        const redis = new Redis_1.default({
            port: endpoint.port || 26379,
            host: endpoint.host,
            username: this.options.sentinelUsername || null,
            password: this.options.sentinelPassword || null,
            family: endpoint.family ||
                // @ts-expect-error
                ("path" in this.options && this.options.path
                    ? undefined
                    : // @ts-expect-error
                        this.options.family),
            tls: this.options.sentinelTLS,
            retryStrategy: null,
            enableReadyCheck: false,
            connectTimeout: this.options.connectTimeout,
            commandTimeout: this.options.sentinelCommandTimeout,
            ...options,
        });
        // @ts-expect-error
        return redis;
    }
    async resolve(endpoint) {
        const client = this.connectToSentinel(endpoint);
        // ignore the errors since resolve* methods will handle them
        client.on("error", noop);
        try {
            if (this.options.role === "slave") {
                return await this.resolveSlave(client);
            }
            else {
                return await this.resolveMaster(client);
            }
        }
        finally {
            client.disconnect();
        }
    }
    async initFailoverDetector() {
        var _a;
        if (!this.options.failoverDetector) {
            return;
        }
        // Move the current sentinel to the first position
        this.sentinelIterator.reset(true);
        const sentinels = [];
        // In case of a large amount of sentinels, limit the number of concurrent connections
        while (sentinels.length < this.options.sentinelMaxConnections) {
            const { done, value } = this.sentinelIterator.next();
            if (done) {
                break;
            }
            const client = this.connectToSentinel(value, {
                lazyConnect: true,
                retryStrategy: this.options.sentinelReconnectStrategy,
            });
            client.on("reconnecting", () => {
                var _a;
                // Tests listen to this event
                (_a = this.emitter) === null || _a === void 0 ? void 0 : _a.emit("sentinelReconnecting");
            });
            sentinels.push({ address: value, client });
        }
        this.sentinelIterator.reset(false);
        if (this.failoverDetector) {
            // Clean up previous detector
            this.failoverDetector.cleanup();
        }
        this.failoverDetector = new FailoverDetector_1.FailoverDetector(this, sentinels);
        await this.failoverDetector.subscribe();
        // Tests listen to this event
        (_a = this.emitter) === null || _a === void 0 ? void 0 : _a.emit("failoverSubscribed");
    }
}
exports.default = SentinelConnector;
function selectPreferredSentinel(availableSlaves, preferredSlaves) {
    if (availableSlaves.length === 0) {
        return null;
    }
    let selectedSlave;
    if (typeof preferredSlaves === "function") {
        selectedSlave = preferredSlaves(availableSlaves);
    }
    else if (preferredSlaves !== null && typeof preferredSlaves === "object") {
        const preferredSlavesArray = Array.isArray(preferredSlaves)
            ? preferredSlaves
            : [preferredSlaves];
        // sort by priority
        preferredSlavesArray.sort((a, b) => {
            // default the priority to 1
            if (!a.prio) {
                a.prio = 1;
            }
            if (!b.prio) {
                b.prio = 1;
            }
            // lowest priority first
            if (a.prio < b.prio) {
                return -1;
            }
            if (a.prio > b.prio) {
                return 1;
            }
            return 0;
        });
        // loop over preferred slaves and return the first match
        for (let p = 0; p < preferredSlavesArray.length; p++) {
            for (let a = 0; a < availableSlaves.length; a++) {
                const slave = availableSlaves[a];
                if (slave.ip === preferredSlavesArray[p].ip) {
                    if (slave.port === preferredSlavesArray[p].port) {
                        selectedSlave = slave;
                        break;
                    }
                }
            }
            if (selectedSlave) {
                break;
            }
        }
    }
    // if none of the preferred slaves are available, a random available slave is returned
    if (!selectedSlave) {
        selectedSlave = (0, utils_1.sample)(availableSlaves);
    }
    return addressResponseToAddress(selectedSlave);
}
function addressResponseToAddress(input) {
    return { host: input.ip, port: Number(input.port) };
}
function noop() { }
