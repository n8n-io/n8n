"use strict";
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _RedisCluster_instances, _RedisCluster_options, _RedisCluster_slots, _RedisCluster_Multi, _RedisCluster_execute;
Object.defineProperty(exports, "__esModule", { value: true });
const commands_1 = require("./commands");
const cluster_slots_1 = require("./cluster-slots");
const commander_1 = require("../commander");
const events_1 = require("events");
const multi_command_1 = require("./multi-command");
const errors_1 = require("../errors");
class RedisCluster extends events_1.EventEmitter {
    static extractFirstKey(command, originalArgs, redisArgs) {
        if (command.FIRST_KEY_INDEX === undefined) {
            return undefined;
        }
        else if (typeof command.FIRST_KEY_INDEX === 'number') {
            return redisArgs[command.FIRST_KEY_INDEX];
        }
        return command.FIRST_KEY_INDEX(...originalArgs);
    }
    static create(options) {
        return new ((0, commander_1.attachExtensions)({
            BaseClass: RedisCluster,
            modulesExecutor: RedisCluster.prototype.commandsExecutor,
            modules: options?.modules,
            functionsExecutor: RedisCluster.prototype.functionsExecutor,
            functions: options?.functions,
            scriptsExecutor: RedisCluster.prototype.scriptsExecutor,
            scripts: options?.scripts
        }))(options);
    }
    get slots() {
        return __classPrivateFieldGet(this, _RedisCluster_slots, "f").slots;
    }
    get shards() {
        return __classPrivateFieldGet(this, _RedisCluster_slots, "f").shards;
    }
    get masters() {
        return __classPrivateFieldGet(this, _RedisCluster_slots, "f").masters;
    }
    get replicas() {
        return __classPrivateFieldGet(this, _RedisCluster_slots, "f").replicas;
    }
    get nodeByAddress() {
        return __classPrivateFieldGet(this, _RedisCluster_slots, "f").nodeByAddress;
    }
    get pubSubNode() {
        return __classPrivateFieldGet(this, _RedisCluster_slots, "f").pubSubNode;
    }
    get isOpen() {
        return __classPrivateFieldGet(this, _RedisCluster_slots, "f").isOpen;
    }
    constructor(options) {
        super();
        _RedisCluster_instances.add(this);
        _RedisCluster_options.set(this, void 0);
        _RedisCluster_slots.set(this, void 0);
        _RedisCluster_Multi.set(this, void 0);
        Object.defineProperty(this, "multi", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: this.MULTI
        });
        Object.defineProperty(this, "subscribe", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: this.SUBSCRIBE
        });
        Object.defineProperty(this, "unsubscribe", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: this.UNSUBSCRIBE
        });
        Object.defineProperty(this, "pSubscribe", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: this.PSUBSCRIBE
        });
        Object.defineProperty(this, "pUnsubscribe", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: this.PUNSUBSCRIBE
        });
        Object.defineProperty(this, "sSubscribe", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: this.SSUBSCRIBE
        });
        Object.defineProperty(this, "sUnsubscribe", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: this.SUNSUBSCRIBE
        });
        __classPrivateFieldSet(this, _RedisCluster_options, options, "f");
        __classPrivateFieldSet(this, _RedisCluster_slots, new cluster_slots_1.default(options, this.emit.bind(this)), "f");
        __classPrivateFieldSet(this, _RedisCluster_Multi, multi_command_1.default.extend(options), "f");
    }
    duplicate(overrides) {
        return new (Object.getPrototypeOf(this).constructor)({
            ...__classPrivateFieldGet(this, _RedisCluster_options, "f"),
            ...overrides
        });
    }
    connect() {
        return __classPrivateFieldGet(this, _RedisCluster_slots, "f").connect();
    }
    async commandsExecutor(command, args) {
        const { jsArgs, args: redisArgs, options } = (0, commander_1.transformCommandArguments)(command, args);
        return (0, commander_1.transformCommandReply)(command, await this.sendCommand(RedisCluster.extractFirstKey(command, jsArgs, redisArgs), command.IS_READ_ONLY, redisArgs, options), redisArgs.preserve);
    }
    async sendCommand(firstKey, isReadonly, args, options) {
        return __classPrivateFieldGet(this, _RedisCluster_instances, "m", _RedisCluster_execute).call(this, firstKey, isReadonly, client => client.sendCommand(args, options));
    }
    async functionsExecutor(fn, args, name) {
        const { args: redisArgs, options } = (0, commander_1.transformCommandArguments)(fn, args);
        return (0, commander_1.transformCommandReply)(fn, await this.executeFunction(name, fn, args, redisArgs, options), redisArgs.preserve);
    }
    async executeFunction(name, fn, originalArgs, redisArgs, options) {
        return __classPrivateFieldGet(this, _RedisCluster_instances, "m", _RedisCluster_execute).call(this, RedisCluster.extractFirstKey(fn, originalArgs, redisArgs), fn.IS_READ_ONLY, client => client.executeFunction(name, fn, redisArgs, options));
    }
    async scriptsExecutor(script, args) {
        const { args: redisArgs, options } = (0, commander_1.transformCommandArguments)(script, args);
        return (0, commander_1.transformCommandReply)(script, await this.executeScript(script, args, redisArgs, options), redisArgs.preserve);
    }
    async executeScript(script, originalArgs, redisArgs, options) {
        return __classPrivateFieldGet(this, _RedisCluster_instances, "m", _RedisCluster_execute).call(this, RedisCluster.extractFirstKey(script, originalArgs, redisArgs), script.IS_READ_ONLY, client => client.executeScript(script, redisArgs, options));
    }
    MULTI(routing) {
        return new (__classPrivateFieldGet(this, _RedisCluster_Multi, "f"))((commands, firstKey, chainId) => {
            return __classPrivateFieldGet(this, _RedisCluster_instances, "m", _RedisCluster_execute).call(this, firstKey, false, client => client.multiExecutor(commands, undefined, chainId));
        }, routing);
    }
    async SUBSCRIBE(channels, listener, bufferMode) {
        return (await __classPrivateFieldGet(this, _RedisCluster_slots, "f").getPubSubClient())
            .SUBSCRIBE(channels, listener, bufferMode);
    }
    async UNSUBSCRIBE(channels, listener, bufferMode) {
        return __classPrivateFieldGet(this, _RedisCluster_slots, "f").executeUnsubscribeCommand(client => client.UNSUBSCRIBE(channels, listener, bufferMode));
    }
    async PSUBSCRIBE(patterns, listener, bufferMode) {
        return (await __classPrivateFieldGet(this, _RedisCluster_slots, "f").getPubSubClient())
            .PSUBSCRIBE(patterns, listener, bufferMode);
    }
    async PUNSUBSCRIBE(patterns, listener, bufferMode) {
        return __classPrivateFieldGet(this, _RedisCluster_slots, "f").executeUnsubscribeCommand(client => client.PUNSUBSCRIBE(patterns, listener, bufferMode));
    }
    async SSUBSCRIBE(channels, listener, bufferMode) {
        const maxCommandRedirections = __classPrivateFieldGet(this, _RedisCluster_options, "f").maxCommandRedirections ?? 16, firstChannel = Array.isArray(channels) ? channels[0] : channels;
        let client = await __classPrivateFieldGet(this, _RedisCluster_slots, "f").getShardedPubSubClient(firstChannel);
        for (let i = 0;; i++) {
            try {
                return await client.SSUBSCRIBE(channels, listener, bufferMode);
            }
            catch (err) {
                if (++i > maxCommandRedirections || !(err instanceof errors_1.ErrorReply)) {
                    throw err;
                }
                if (err.message.startsWith('MOVED')) {
                    await __classPrivateFieldGet(this, _RedisCluster_slots, "f").rediscover(client);
                    client = await __classPrivateFieldGet(this, _RedisCluster_slots, "f").getShardedPubSubClient(firstChannel);
                    continue;
                }
                throw err;
            }
        }
    }
    SUNSUBSCRIBE(channels, listener, bufferMode) {
        return __classPrivateFieldGet(this, _RedisCluster_slots, "f").executeShardedUnsubscribeCommand(Array.isArray(channels) ? channels[0] : channels, client => client.SUNSUBSCRIBE(channels, listener, bufferMode));
    }
    quit() {
        return __classPrivateFieldGet(this, _RedisCluster_slots, "f").quit();
    }
    disconnect() {
        return __classPrivateFieldGet(this, _RedisCluster_slots, "f").disconnect();
    }
    nodeClient(node) {
        return __classPrivateFieldGet(this, _RedisCluster_slots, "f").nodeClient(node);
    }
    getRandomNode() {
        return __classPrivateFieldGet(this, _RedisCluster_slots, "f").getRandomNode();
    }
    getSlotRandomNode(slot) {
        return __classPrivateFieldGet(this, _RedisCluster_slots, "f").getSlotRandomNode(slot);
    }
    /**
     * @deprecated use `.masters` instead
     */
    getMasters() {
        return this.masters;
    }
    /**
     * @deprecated use `.slots[<SLOT>]` instead
     */
    getSlotMaster(slot) {
        return this.slots[slot].master;
    }
}
_RedisCluster_options = new WeakMap(), _RedisCluster_slots = new WeakMap(), _RedisCluster_Multi = new WeakMap(), _RedisCluster_instances = new WeakSet(), _RedisCluster_execute = async function _RedisCluster_execute(firstKey, isReadonly, executor) {
    const maxCommandRedirections = __classPrivateFieldGet(this, _RedisCluster_options, "f").maxCommandRedirections ?? 16;
    let client = await __classPrivateFieldGet(this, _RedisCluster_slots, "f").getClient(firstKey, isReadonly);
    for (let i = 0;; i++) {
        try {
            return await executor(client);
        }
        catch (err) {
            if (++i > maxCommandRedirections || !(err instanceof errors_1.ErrorReply)) {
                throw err;
            }
            if (err.message.startsWith('ASK')) {
                const address = err.message.substring(err.message.lastIndexOf(' ') + 1);
                let redirectTo = await __classPrivateFieldGet(this, _RedisCluster_slots, "f").getMasterByAddress(address);
                if (!redirectTo) {
                    await __classPrivateFieldGet(this, _RedisCluster_slots, "f").rediscover(client);
                    redirectTo = await __classPrivateFieldGet(this, _RedisCluster_slots, "f").getMasterByAddress(address);
                }
                if (!redirectTo) {
                    throw new Error(`Cannot find node ${address}`);
                }
                await redirectTo.asking();
                client = redirectTo;
                continue;
            }
            else if (err.message.startsWith('MOVED')) {
                await __classPrivateFieldGet(this, _RedisCluster_slots, "f").rediscover(client);
                client = await __classPrivateFieldGet(this, _RedisCluster_slots, "f").getClient(firstKey, isReadonly);
                continue;
            }
            throw err;
        }
    }
};
exports.default = RedisCluster;
(0, commander_1.attachCommands)({
    BaseClass: RedisCluster,
    commands: commands_1.default,
    executor: RedisCluster.prototype.commandsExecutor
});
