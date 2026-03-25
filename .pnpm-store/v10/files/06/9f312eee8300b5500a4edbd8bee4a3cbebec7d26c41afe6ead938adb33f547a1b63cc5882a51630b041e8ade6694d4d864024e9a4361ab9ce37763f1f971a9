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
var _RedisClusterSlots_instances, _a, _RedisClusterSlots_SLOTS, _RedisClusterSlots_options, _RedisClusterSlots_Client, _RedisClusterSlots_emit, _RedisClusterSlots_isOpen, _RedisClusterSlots_discoverWithRootNodes, _RedisClusterSlots_resetSlots, _RedisClusterSlots_discover, _RedisClusterSlots_getShards, _RedisClusterSlots_getNodeAddress, _RedisClusterSlots_clientOptionsDefaults, _RedisClusterSlots_initiateSlotNode, _RedisClusterSlots_createClient, _RedisClusterSlots_createNodeClient, _RedisClusterSlots_runningRediscoverPromise, _RedisClusterSlots_rediscover, _RedisClusterSlots_destroy, _RedisClusterSlots_execOnNodeClient, _RedisClusterSlots_iterateAllNodes, _RedisClusterSlots_randomNodeIterator, _RedisClusterSlots_slotNodesIterator, _RedisClusterSlots_initiatePubSubClient, _RedisClusterSlots_initiateShardedPubSubClient;
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("../client");
const errors_1 = require("../errors");
const util_1 = require("util");
const pub_sub_1 = require("../client/pub-sub");
// We need to use 'require', because it's not possible with Typescript to import
// function that are exported as 'module.exports = function`, without esModuleInterop
// set to true.
const calculateSlot = require('cluster-key-slot');
class RedisClusterSlots {
    get isOpen() {
        return __classPrivateFieldGet(this, _RedisClusterSlots_isOpen, "f");
    }
    constructor(options, emit) {
        _RedisClusterSlots_instances.add(this);
        _RedisClusterSlots_options.set(this, void 0);
        _RedisClusterSlots_Client.set(this, void 0);
        _RedisClusterSlots_emit.set(this, void 0);
        Object.defineProperty(this, "slots", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Array(__classPrivateFieldGet(_a, _a, "f", _RedisClusterSlots_SLOTS))
        });
        Object.defineProperty(this, "shards", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Array()
        });
        Object.defineProperty(this, "masters", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Array()
        });
        Object.defineProperty(this, "replicas", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Array()
        });
        Object.defineProperty(this, "nodeByAddress", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        Object.defineProperty(this, "pubSubNode", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        _RedisClusterSlots_isOpen.set(this, false);
        _RedisClusterSlots_runningRediscoverPromise.set(this, void 0);
        _RedisClusterSlots_randomNodeIterator.set(this, void 0);
        __classPrivateFieldSet(this, _RedisClusterSlots_options, options, "f");
        __classPrivateFieldSet(this, _RedisClusterSlots_Client, client_1.default.extend(options), "f");
        __classPrivateFieldSet(this, _RedisClusterSlots_emit, emit, "f");
    }
    async connect() {
        if (__classPrivateFieldGet(this, _RedisClusterSlots_isOpen, "f")) {
            throw new Error('Cluster already open');
        }
        __classPrivateFieldSet(this, _RedisClusterSlots_isOpen, true, "f");
        try {
            await __classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_discoverWithRootNodes).call(this);
        }
        catch (err) {
            __classPrivateFieldSet(this, _RedisClusterSlots_isOpen, false, "f");
            throw err;
        }
    }
    nodeClient(node) {
        return node.client ?? __classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_createNodeClient).call(this, node);
    }
    async rediscover(startWith) {
        __classPrivateFieldSet(this, _RedisClusterSlots_runningRediscoverPromise, __classPrivateFieldGet(this, _RedisClusterSlots_runningRediscoverPromise, "f") ?? __classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_rediscover).call(this, startWith)
            .finally(() => __classPrivateFieldSet(this, _RedisClusterSlots_runningRediscoverPromise, undefined, "f")), "f");
        return __classPrivateFieldGet(this, _RedisClusterSlots_runningRediscoverPromise, "f");
    }
    quit() {
        return __classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_destroy).call(this, client => client.quit());
    }
    disconnect() {
        return __classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_destroy).call(this, client => client.disconnect());
    }
    getClient(firstKey, isReadonly) {
        if (!firstKey) {
            return this.nodeClient(this.getRandomNode());
        }
        const slotNumber = calculateSlot(firstKey);
        if (!isReadonly) {
            return this.nodeClient(this.slots[slotNumber].master);
        }
        return this.nodeClient(this.getSlotRandomNode(slotNumber));
    }
    getRandomNode() {
        __classPrivateFieldSet(this, _RedisClusterSlots_randomNodeIterator, __classPrivateFieldGet(this, _RedisClusterSlots_randomNodeIterator, "f") ?? __classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_iterateAllNodes).call(this), "f");
        return __classPrivateFieldGet(this, _RedisClusterSlots_randomNodeIterator, "f").next().value;
    }
    getSlotRandomNode(slotNumber) {
        const slot = this.slots[slotNumber];
        if (!slot.replicas?.length) {
            return slot.master;
        }
        slot.nodesIterator ?? (slot.nodesIterator = __classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_slotNodesIterator).call(this, slot));
        return slot.nodesIterator.next().value;
    }
    getMasterByAddress(address) {
        const master = this.nodeByAddress.get(address);
        if (!master)
            return;
        return this.nodeClient(master);
    }
    getPubSubClient() {
        return this.pubSubNode ?
            this.pubSubNode.client :
            __classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_initiatePubSubClient).call(this);
    }
    async executeUnsubscribeCommand(unsubscribe) {
        const client = await this.getPubSubClient();
        await unsubscribe(client);
        if (!client.isPubSubActive && client.isOpen) {
            await client.disconnect();
            this.pubSubNode = undefined;
        }
    }
    getShardedPubSubClient(channel) {
        const { master } = this.slots[calculateSlot(channel)];
        return master.pubSubClient ?? __classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_initiateShardedPubSubClient).call(this, master);
    }
    async executeShardedUnsubscribeCommand(channel, unsubscribe) {
        const { master } = this.slots[calculateSlot(channel)];
        if (!master.pubSubClient)
            return Promise.resolve();
        const client = await master.pubSubClient;
        await unsubscribe(client);
        if (!client.isPubSubActive && client.isOpen) {
            await client.disconnect();
            master.pubSubClient = undefined;
        }
    }
}
_a = RedisClusterSlots, _RedisClusterSlots_options = new WeakMap(), _RedisClusterSlots_Client = new WeakMap(), _RedisClusterSlots_emit = new WeakMap(), _RedisClusterSlots_isOpen = new WeakMap(), _RedisClusterSlots_runningRediscoverPromise = new WeakMap(), _RedisClusterSlots_randomNodeIterator = new WeakMap(), _RedisClusterSlots_instances = new WeakSet(), _RedisClusterSlots_discoverWithRootNodes = async function _RedisClusterSlots_discoverWithRootNodes() {
    let start = Math.floor(Math.random() * __classPrivateFieldGet(this, _RedisClusterSlots_options, "f").rootNodes.length);
    for (let i = start; i < __classPrivateFieldGet(this, _RedisClusterSlots_options, "f").rootNodes.length; i++) {
        if (await __classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_discover).call(this, __classPrivateFieldGet(this, _RedisClusterSlots_options, "f").rootNodes[i]))
            return;
    }
    for (let i = 0; i < start; i++) {
        if (await __classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_discover).call(this, __classPrivateFieldGet(this, _RedisClusterSlots_options, "f").rootNodes[i]))
            return;
    }
    throw new errors_1.RootNodesUnavailableError();
}, _RedisClusterSlots_resetSlots = function _RedisClusterSlots_resetSlots() {
    this.slots = new Array(__classPrivateFieldGet(_a, _a, "f", _RedisClusterSlots_SLOTS));
    this.shards = [];
    this.masters = [];
    this.replicas = [];
    __classPrivateFieldSet(this, _RedisClusterSlots_randomNodeIterator, undefined, "f");
}, _RedisClusterSlots_discover = async function _RedisClusterSlots_discover(rootNode) {
    const addressesInUse = new Set();
    try {
        const shards = await __classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_getShards).call(this, rootNode), promises = [], eagerConnect = __classPrivateFieldGet(this, _RedisClusterSlots_options, "f").minimizeConnections !== true;
        __classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_resetSlots).call(this);
        for (const { from, to, master, replicas } of shards) {
            const shard = {
                master: __classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_initiateSlotNode).call(this, master, false, eagerConnect, addressesInUse, promises)
            };
            if (__classPrivateFieldGet(this, _RedisClusterSlots_options, "f").useReplicas) {
                shard.replicas = replicas.map(replica => __classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_initiateSlotNode).call(this, replica, true, eagerConnect, addressesInUse, promises));
            }
            this.shards.push(shard);
            for (let i = from; i <= to; i++) {
                this.slots[i] = shard;
            }
        }
        if (this.pubSubNode && !addressesInUse.has(this.pubSubNode.address)) {
            if (util_1.types.isPromise(this.pubSubNode.client)) {
                promises.push(this.pubSubNode.client.then(client => client.disconnect()));
                this.pubSubNode = undefined;
            }
            else {
                promises.push(this.pubSubNode.client.disconnect());
                const channelsListeners = this.pubSubNode.client.getPubSubListeners(pub_sub_1.PubSubType.CHANNELS), patternsListeners = this.pubSubNode.client.getPubSubListeners(pub_sub_1.PubSubType.PATTERNS);
                if (channelsListeners.size || patternsListeners.size) {
                    promises.push(__classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_initiatePubSubClient).call(this, {
                        [pub_sub_1.PubSubType.CHANNELS]: channelsListeners,
                        [pub_sub_1.PubSubType.PATTERNS]: patternsListeners
                    }));
                }
            }
        }
        for (const [address, node] of this.nodeByAddress.entries()) {
            if (addressesInUse.has(address))
                continue;
            if (node.client) {
                promises.push(__classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_execOnNodeClient).call(this, node.client, client => client.disconnect()));
            }
            const { pubSubClient } = node;
            if (pubSubClient) {
                promises.push(__classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_execOnNodeClient).call(this, pubSubClient, client => client.disconnect()));
            }
            this.nodeByAddress.delete(address);
        }
        await Promise.all(promises);
        return true;
    }
    catch (err) {
        __classPrivateFieldGet(this, _RedisClusterSlots_emit, "f").call(this, 'error', err);
        return false;
    }
}, _RedisClusterSlots_getShards = async function _RedisClusterSlots_getShards(rootNode) {
    const client = new (__classPrivateFieldGet(this, _RedisClusterSlots_Client, "f"))(__classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_clientOptionsDefaults).call(this, rootNode, true));
    client.on('error', err => __classPrivateFieldGet(this, _RedisClusterSlots_emit, "f").call(this, 'error', err));
    await client.connect();
    try {
        // using `CLUSTER SLOTS` and not `CLUSTER SHARDS` to support older versions
        return await client.clusterSlots();
    }
    finally {
        await client.disconnect();
    }
}, _RedisClusterSlots_getNodeAddress = function _RedisClusterSlots_getNodeAddress(address) {
    switch (typeof __classPrivateFieldGet(this, _RedisClusterSlots_options, "f").nodeAddressMap) {
        case 'object':
            return __classPrivateFieldGet(this, _RedisClusterSlots_options, "f").nodeAddressMap[address];
        case 'function':
            return __classPrivateFieldGet(this, _RedisClusterSlots_options, "f").nodeAddressMap(address);
    }
}, _RedisClusterSlots_clientOptionsDefaults = function _RedisClusterSlots_clientOptionsDefaults(options, disableReconnect) {
    let result;
    if (__classPrivateFieldGet(this, _RedisClusterSlots_options, "f").defaults) {
        let socket;
        if (__classPrivateFieldGet(this, _RedisClusterSlots_options, "f").defaults.socket) {
            socket = options?.socket ? {
                ...__classPrivateFieldGet(this, _RedisClusterSlots_options, "f").defaults.socket,
                ...options.socket
            } : __classPrivateFieldGet(this, _RedisClusterSlots_options, "f").defaults.socket;
        }
        else {
            socket = options?.socket;
        }
        result = {
            ...__classPrivateFieldGet(this, _RedisClusterSlots_options, "f").defaults,
            ...options,
            socket
        };
    }
    else {
        result = options;
    }
    if (disableReconnect) {
        result ?? (result = {});
        result.socket ?? (result.socket = {});
        result.socket.reconnectStrategy = false;
    }
    return result;
}, _RedisClusterSlots_initiateSlotNode = function _RedisClusterSlots_initiateSlotNode({ id, ip, port }, readonly, eagerConnent, addressesInUse, promises) {
    const address = `${ip}:${port}`;
    addressesInUse.add(address);
    let node = this.nodeByAddress.get(address);
    if (!node) {
        node = {
            id,
            host: ip,
            port,
            address,
            readonly,
            client: undefined
        };
        if (eagerConnent) {
            promises.push(__classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_createNodeClient).call(this, node));
        }
        this.nodeByAddress.set(address, node);
    }
    (readonly ? this.replicas : this.masters).push(node);
    return node;
}, _RedisClusterSlots_createClient = async function _RedisClusterSlots_createClient(node, readonly = node.readonly) {
    const client = new (__classPrivateFieldGet(this, _RedisClusterSlots_Client, "f"))(__classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_clientOptionsDefaults).call(this, {
        socket: __classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_getNodeAddress).call(this, node.address) ?? {
            host: node.host,
            port: node.port
        },
        readonly
    }));
    client.on('error', err => __classPrivateFieldGet(this, _RedisClusterSlots_emit, "f").call(this, 'error', err));
    await client.connect();
    return client;
}, _RedisClusterSlots_createNodeClient = function _RedisClusterSlots_createNodeClient(node) {
    const promise = __classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_createClient).call(this, node)
        .then(client => {
        node.client = client;
        return client;
    })
        .catch(err => {
        node.client = undefined;
        throw err;
    });
    node.client = promise;
    return promise;
}, _RedisClusterSlots_rediscover = async function _RedisClusterSlots_rediscover(startWith) {
    if (await __classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_discover).call(this, startWith.options))
        return;
    return __classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_discoverWithRootNodes).call(this);
}, _RedisClusterSlots_destroy = async function _RedisClusterSlots_destroy(fn) {
    __classPrivateFieldSet(this, _RedisClusterSlots_isOpen, false, "f");
    const promises = [];
    for (const { master, replicas } of this.shards) {
        if (master.client) {
            promises.push(__classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_execOnNodeClient).call(this, master.client, fn));
        }
        if (master.pubSubClient) {
            promises.push(__classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_execOnNodeClient).call(this, master.pubSubClient, fn));
        }
        if (replicas) {
            for (const { client } of replicas) {
                if (client) {
                    promises.push(__classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_execOnNodeClient).call(this, client, fn));
                }
            }
        }
    }
    if (this.pubSubNode) {
        promises.push(__classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_execOnNodeClient).call(this, this.pubSubNode.client, fn));
        this.pubSubNode = undefined;
    }
    __classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_resetSlots).call(this);
    this.nodeByAddress.clear();
    await Promise.allSettled(promises);
}, _RedisClusterSlots_execOnNodeClient = function _RedisClusterSlots_execOnNodeClient(client, fn) {
    return util_1.types.isPromise(client) ?
        client.then(fn) :
        fn(client);
}, _RedisClusterSlots_iterateAllNodes = function* _RedisClusterSlots_iterateAllNodes() {
    let i = Math.floor(Math.random() * (this.masters.length + this.replicas.length));
    if (i < this.masters.length) {
        do {
            yield this.masters[i];
        } while (++i < this.masters.length);
        for (const replica of this.replicas) {
            yield replica;
        }
    }
    else {
        i -= this.masters.length;
        do {
            yield this.replicas[i];
        } while (++i < this.replicas.length);
    }
    while (true) {
        for (const master of this.masters) {
            yield master;
        }
        for (const replica of this.replicas) {
            yield replica;
        }
    }
}, _RedisClusterSlots_slotNodesIterator = function* _RedisClusterSlots_slotNodesIterator(slot) {
    let i = Math.floor(Math.random() * (1 + slot.replicas.length));
    if (i < slot.replicas.length) {
        do {
            yield slot.replicas[i];
        } while (++i < slot.replicas.length);
    }
    while (true) {
        yield slot.master;
        for (const replica of slot.replicas) {
            yield replica;
        }
    }
}, _RedisClusterSlots_initiatePubSubClient = async function _RedisClusterSlots_initiatePubSubClient(toResubscribe) {
    const index = Math.floor(Math.random() * (this.masters.length + this.replicas.length)), node = index < this.masters.length ?
        this.masters[index] :
        this.replicas[index - this.masters.length];
    this.pubSubNode = {
        address: node.address,
        client: __classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_createClient).call(this, node, true)
            .then(async (client) => {
            if (toResubscribe) {
                await Promise.all([
                    client.extendPubSubListeners(pub_sub_1.PubSubType.CHANNELS, toResubscribe[pub_sub_1.PubSubType.CHANNELS]),
                    client.extendPubSubListeners(pub_sub_1.PubSubType.PATTERNS, toResubscribe[pub_sub_1.PubSubType.PATTERNS])
                ]);
            }
            this.pubSubNode.client = client;
            return client;
        })
            .catch(err => {
            this.pubSubNode = undefined;
            throw err;
        })
    };
    return this.pubSubNode.client;
}, _RedisClusterSlots_initiateShardedPubSubClient = function _RedisClusterSlots_initiateShardedPubSubClient(master) {
    const promise = __classPrivateFieldGet(this, _RedisClusterSlots_instances, "m", _RedisClusterSlots_createClient).call(this, master, true)
        .then(client => {
        client.on('server-sunsubscribe', async (channel, listeners) => {
            try {
                await this.rediscover(client);
                const redirectTo = await this.getShardedPubSubClient(channel);
                redirectTo.extendPubSubChannelListeners(pub_sub_1.PubSubType.SHARDED, channel, listeners);
            }
            catch (err) {
                __classPrivateFieldGet(this, _RedisClusterSlots_emit, "f").call(this, 'sharded-shannel-moved-error', err, channel, listeners);
            }
        });
        master.pubSubClient = client;
        return client;
    })
        .catch(err => {
        master.pubSubClient = undefined;
        throw err;
    });
    master.pubSubClient = promise;
    return promise;
};
_RedisClusterSlots_SLOTS = { value: 16384 };
exports.default = RedisClusterSlots;
