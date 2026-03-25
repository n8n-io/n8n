"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
const utils_1 = require("../utils");
const Redis_1 = require("../Redis");
const debug = (0, utils_1.Debug)("cluster:subscriber");
class ClusterSubscriber {
    constructor(connectionPool, emitter) {
        this.connectionPool = connectionPool;
        this.emitter = emitter;
        this.started = false;
        this.subscriber = null;
        this.onSubscriberEnd = () => {
            if (!this.started) {
                debug("subscriber has disconnected, but ClusterSubscriber is not started, so not reconnecting.");
                return;
            }
            // If the subscriber closes whilst it's still the active connection,
            // we might as well try to connecting to a new node if possible to
            // minimise the number of missed publishes.
            debug("subscriber has disconnected, selecting a new one...");
            this.selectSubscriber();
        };
        // If the current node we're using as the subscriber disappears
        // from the node pool for some reason, we will select a new one
        // to connect to.
        // Note that this event is only triggered if the connection to
        // the node has been used; cluster subscriptions are setup with
        // lazyConnect = true. It's possible for the subscriber node to
        // disappear without this method being called!
        // See https://github.com/luin/ioredis/pull/1589
        this.connectionPool.on("-node", (_, key) => {
            if (!this.started || !this.subscriber) {
                return;
            }
            if ((0, util_1.getNodeKey)(this.subscriber.options) === key) {
                debug("subscriber has left, selecting a new one...");
                this.selectSubscriber();
            }
        });
        this.connectionPool.on("+node", () => {
            if (!this.started || this.subscriber) {
                return;
            }
            debug("a new node is discovered and there is no subscriber, selecting a new one...");
            this.selectSubscriber();
        });
    }
    getInstance() {
        return this.subscriber;
    }
    start() {
        this.started = true;
        this.selectSubscriber();
        debug("started");
    }
    stop() {
        this.started = false;
        if (this.subscriber) {
            this.subscriber.disconnect();
            this.subscriber = null;
        }
        debug("stopped");
    }
    selectSubscriber() {
        const lastActiveSubscriber = this.lastActiveSubscriber;
        // Disconnect the previous subscriber even if there
        // will not be a new one.
        if (lastActiveSubscriber) {
            lastActiveSubscriber.off("end", this.onSubscriberEnd);
            lastActiveSubscriber.disconnect();
        }
        if (this.subscriber) {
            this.subscriber.off("end", this.onSubscriberEnd);
            this.subscriber.disconnect();
        }
        const sampleNode = (0, utils_1.sample)(this.connectionPool.getNodes());
        if (!sampleNode) {
            debug("selecting subscriber failed since there is no node discovered in the cluster yet");
            this.subscriber = null;
            return;
        }
        const { options } = sampleNode;
        debug("selected a subscriber %s:%s", options.host, options.port);
        /*
         * Create a specialized Redis connection for the subscription.
         * Note that auto reconnection is enabled here.
         *
         * `enableReadyCheck` is also enabled because although subscription is allowed
         * while redis is loading data from the disk, we can check if the password
         * provided for the subscriber is correct, and if not, the current subscriber
         * will be disconnected and a new subscriber will be selected.
         */
        this.subscriber = new Redis_1.default({
            port: options.port,
            host: options.host,
            username: options.username,
            password: options.password,
            enableReadyCheck: true,
            connectionName: (0, util_1.getConnectionName)("subscriber", options.connectionName),
            lazyConnect: true,
            tls: options.tls,
            // Don't try to reconnect the subscriber connection. If the connection fails
            // we will get an end event (handled below), at which point we'll pick a new
            // node from the pool and try to connect to that as the subscriber connection.
            retryStrategy: null,
        });
        // Ignore the errors since they're handled in the connection pool.
        this.subscriber.on("error", utils_1.noop);
        // The node we lost connection to may not come back up in a
        // reasonable amount of time (e.g. a slave that's taken down
        // for maintainence), we could potentially miss many published
        // messages so we should reconnect as quickly as possible, to
        // a different node if needed.
        this.subscriber.once("end", this.onSubscriberEnd);
        // Re-subscribe previous channels
        const previousChannels = { subscribe: [], psubscribe: [], ssubscribe: [] };
        if (lastActiveSubscriber) {
            const condition = lastActiveSubscriber.condition || lastActiveSubscriber.prevCondition;
            if (condition && condition.subscriber) {
                previousChannels.subscribe = condition.subscriber.channels("subscribe");
                previousChannels.psubscribe =
                    condition.subscriber.channels("psubscribe");
                previousChannels.ssubscribe =
                    condition.subscriber.channels("ssubscribe");
            }
        }
        if (previousChannels.subscribe.length ||
            previousChannels.psubscribe.length ||
            previousChannels.ssubscribe.length) {
            let pending = 0;
            for (const type of ["subscribe", "psubscribe", "ssubscribe"]) {
                const channels = previousChannels[type];
                if (channels.length) {
                    pending += 1;
                    debug("%s %d channels", type, channels.length);
                    this.subscriber[type](channels)
                        .then(() => {
                        if (!--pending) {
                            this.lastActiveSubscriber = this.subscriber;
                        }
                    })
                        .catch(() => {
                        // TODO: should probably disconnect the subscriber and try again.
                        debug("failed to %s %d channels", type, channels.length);
                    });
                }
            }
        }
        else {
            this.lastActiveSubscriber = this.subscriber;
        }
        for (const event of [
            "message",
            "messageBuffer",
            "smessage",
            "smessageBuffer",
        ]) {
            this.subscriber.on(event, (arg1, arg2) => {
                this.emitter.emit(event, arg1, arg2);
            });
        }
        for (const event of ["pmessage", "pmessageBuffer"]) {
            this.subscriber.on(event, (arg1, arg2, arg3) => {
                this.emitter.emit(event, arg1, arg2, arg3);
            });
        }
    }
}
exports.default = ClusterSubscriber;
