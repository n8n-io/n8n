"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const utils_1 = require("../utils");
const util_1 = require("./util");
const Redis_1 = require("../Redis");
const debug = (0, utils_1.Debug)("cluster:connectionPool");
class ConnectionPool extends events_1.EventEmitter {
    constructor(redisOptions) {
        super();
        this.redisOptions = redisOptions;
        // master + slave = all
        this.nodes = {
            all: {},
            master: {},
            slave: {},
        };
        this.specifiedOptions = {};
    }
    getNodes(role = "all") {
        const nodes = this.nodes[role];
        return Object.keys(nodes).map((key) => nodes[key]);
    }
    getInstanceByKey(key) {
        return this.nodes.all[key];
    }
    getSampleInstance(role) {
        const keys = Object.keys(this.nodes[role]);
        const sampleKey = (0, utils_1.sample)(keys);
        return this.nodes[role][sampleKey];
    }
    /**
     * Find or create a connection to the node
     */
    findOrCreate(node, readOnly = false) {
        const key = (0, util_1.getNodeKey)(node);
        readOnly = Boolean(readOnly);
        if (this.specifiedOptions[key]) {
            Object.assign(node, this.specifiedOptions[key]);
        }
        else {
            this.specifiedOptions[key] = node;
        }
        let redis;
        if (this.nodes.all[key]) {
            redis = this.nodes.all[key];
            if (redis.options.readOnly !== readOnly) {
                redis.options.readOnly = readOnly;
                debug("Change role of %s to %s", key, readOnly ? "slave" : "master");
                redis[readOnly ? "readonly" : "readwrite"]().catch(utils_1.noop);
                if (readOnly) {
                    delete this.nodes.master[key];
                    this.nodes.slave[key] = redis;
                }
                else {
                    delete this.nodes.slave[key];
                    this.nodes.master[key] = redis;
                }
            }
        }
        else {
            debug("Connecting to %s as %s", key, readOnly ? "slave" : "master");
            redis = new Redis_1.default((0, utils_1.defaults)({
                // Never try to reconnect when a node is lose,
                // instead, waiting for a `MOVED` error and
                // fetch the slots again.
                retryStrategy: null,
                // Offline queue should be enabled so that
                // we don't need to wait for the `ready` event
                // before sending commands to the node.
                enableOfflineQueue: true,
                readOnly: readOnly,
            }, node, this.redisOptions, { lazyConnect: true }));
            this.nodes.all[key] = redis;
            this.nodes[readOnly ? "slave" : "master"][key] = redis;
            redis.once("end", () => {
                this.removeNode(key);
                this.emit("-node", redis, key);
                if (!Object.keys(this.nodes.all).length) {
                    this.emit("drain");
                }
            });
            this.emit("+node", redis, key);
            redis.on("error", function (error) {
                this.emit("nodeError", error, key);
            });
        }
        return redis;
    }
    /**
     * Reset the pool with a set of nodes.
     * The old node will be removed.
     */
    reset(nodes) {
        debug("Reset with %O", nodes);
        const newNodes = {};
        nodes.forEach((node) => {
            const key = (0, util_1.getNodeKey)(node);
            // Don't override the existing (master) node
            // when the current one is slave.
            if (!(node.readOnly && newNodes[key])) {
                newNodes[key] = node;
            }
        });
        Object.keys(this.nodes.all).forEach((key) => {
            if (!newNodes[key]) {
                debug("Disconnect %s because the node does not hold any slot", key);
                this.nodes.all[key].disconnect();
                this.removeNode(key);
            }
        });
        Object.keys(newNodes).forEach((key) => {
            const node = newNodes[key];
            this.findOrCreate(node, node.readOnly);
        });
    }
    /**
     * Remove a node from the pool.
     */
    removeNode(key) {
        const { nodes } = this;
        if (nodes.all[key]) {
            debug("Remove %s from the pool", key);
            delete nodes.all[key];
        }
        delete nodes.master[key];
        delete nodes.slave[key];
    }
}
exports.default = ConnectionPool;
