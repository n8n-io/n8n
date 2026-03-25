"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const topic_alias_recv_1 = __importDefault(require("./topic-alias-recv"));
const mqtt_packet_1 = __importDefault(require("mqtt-packet"));
const default_message_id_provider_1 = __importDefault(require("./default-message-id-provider"));
const readable_stream_1 = require("readable-stream");
const default_1 = __importDefault(require("rfdc/default"));
const validations = __importStar(require("./validations"));
const debug_1 = __importDefault(require("debug"));
const store_1 = __importDefault(require("./store"));
const handlers_1 = __importDefault(require("./handlers"));
const shared_1 = require("./shared");
const TypedEmitter_1 = require("./TypedEmitter");
const KeepaliveManager_1 = __importDefault(require("./KeepaliveManager"));
const is_browser_1 = __importStar(require("./is-browser"));
const setImmediate = globalThis.setImmediate ||
    ((...args) => {
        const callback = args.shift();
        (0, shared_1.nextTick)(() => {
            callback(...args);
        });
    });
const defaultConnectOptions = {
    keepalive: 60,
    reschedulePings: true,
    protocolId: 'MQTT',
    protocolVersion: 4,
    reconnectPeriod: 1000,
    connectTimeout: 30 * 1000,
    clean: true,
    resubscribe: true,
    writeCache: true,
    timerVariant: 'auto',
};
class MqttClient extends TypedEmitter_1.TypedEventEmitter {
    static defaultId() {
        return `mqttjs_${Math.random().toString(16).substr(2, 8)}`;
    }
    constructor(streamBuilder, options) {
        super();
        this.options = options || {};
        for (const k in defaultConnectOptions) {
            if (typeof this.options[k] === 'undefined') {
                this.options[k] = defaultConnectOptions[k];
            }
            else {
                this.options[k] = options[k];
            }
        }
        this.log = this.options.log || (0, debug_1.default)('mqttjs:client');
        this.noop = this._noop.bind(this);
        this.log('MqttClient :: version:', MqttClient.VERSION);
        if (is_browser_1.isWebWorker) {
            this.log('MqttClient :: environment', 'webworker');
        }
        else {
            this.log('MqttClient :: environment', is_browser_1.default ? 'browser' : 'node');
        }
        this.log('MqttClient :: options.protocol', options.protocol);
        this.log('MqttClient :: options.protocolVersion', options.protocolVersion);
        this.log('MqttClient :: options.username', options.username);
        this.log('MqttClient :: options.keepalive', options.keepalive);
        this.log('MqttClient :: options.reconnectPeriod', options.reconnectPeriod);
        this.log('MqttClient :: options.rejectUnauthorized', options.rejectUnauthorized);
        this.log('MqttClient :: options.properties.topicAliasMaximum', options.properties
            ? options.properties.topicAliasMaximum
            : undefined);
        this.options.clientId =
            typeof options.clientId === 'string'
                ? options.clientId
                : MqttClient.defaultId();
        this.log('MqttClient :: clientId', this.options.clientId);
        this.options.customHandleAcks =
            options.protocolVersion === 5 && options.customHandleAcks
                ? options.customHandleAcks
                : (...args) => {
                    args[3](null, 0);
                };
        if (!this.options.writeCache) {
            mqtt_packet_1.default.writeToStream.cacheNumbers = false;
        }
        this.streamBuilder = streamBuilder;
        this.messageIdProvider =
            typeof this.options.messageIdProvider === 'undefined'
                ? new default_message_id_provider_1.default()
                : this.options.messageIdProvider;
        this.outgoingStore = options.outgoingStore || new store_1.default();
        this.incomingStore = options.incomingStore || new store_1.default();
        this.queueQoSZero =
            options.queueQoSZero === undefined ? true : options.queueQoSZero;
        this._resubscribeTopics = {};
        this.messageIdToTopic = {};
        this.keepaliveManager = null;
        this.connected = false;
        this.disconnecting = false;
        this.reconnecting = false;
        this.queue = [];
        this.connackTimer = null;
        this.reconnectTimer = null;
        this._storeProcessing = false;
        this._packetIdsDuringStoreProcessing = {};
        this._storeProcessingQueue = [];
        this.outgoing = {};
        this._firstConnection = true;
        if (options.properties && options.properties.topicAliasMaximum > 0) {
            if (options.properties.topicAliasMaximum > 0xffff) {
                this.log('MqttClient :: options.properties.topicAliasMaximum is out of range');
            }
            else {
                this.topicAliasRecv = new topic_alias_recv_1.default(options.properties.topicAliasMaximum);
            }
        }
        this.on('connect', () => {
            const { queue } = this;
            const deliver = () => {
                const entry = queue.shift();
                this.log('deliver :: entry %o', entry);
                let packet = null;
                if (!entry) {
                    this._resubscribe();
                    return;
                }
                packet = entry.packet;
                this.log('deliver :: call _sendPacket for %o', packet);
                let send = true;
                if (packet.messageId && packet.messageId !== 0) {
                    if (!this.messageIdProvider.register(packet.messageId)) {
                        send = false;
                    }
                }
                if (send) {
                    this._sendPacket(packet, (err) => {
                        if (entry.cb) {
                            entry.cb(err);
                        }
                        deliver();
                    });
                }
                else {
                    this.log('messageId: %d has already used. The message is skipped and removed.', packet.messageId);
                    deliver();
                }
            };
            this.log('connect :: sending queued packets');
            deliver();
        });
        this.on('close', () => {
            this.log('close :: connected set to `false`');
            this.connected = false;
            this.log('close :: clearing connackTimer');
            clearTimeout(this.connackTimer);
            this._destroyKeepaliveManager();
            if (this.topicAliasRecv) {
                this.topicAliasRecv.clear();
            }
            this.log('close :: calling _setupReconnect');
            this._setupReconnect();
        });
        if (!this.options.manualConnect) {
            this.log('MqttClient :: setting up stream');
            this.connect();
        }
    }
    handleAuth(packet, callback) {
        callback();
    }
    handleMessage(packet, callback) {
        callback();
    }
    _nextId() {
        return this.messageIdProvider.allocate();
    }
    getLastMessageId() {
        return this.messageIdProvider.getLastAllocated();
    }
    connect() {
        var _a;
        const writable = new readable_stream_1.Writable();
        const parser = mqtt_packet_1.default.parser(this.options);
        let completeParse = null;
        const packets = [];
        this.log('connect :: calling method to clear reconnect');
        this._clearReconnect();
        this.log('connect :: using streamBuilder provided to client to create stream');
        this.stream = this.streamBuilder(this);
        parser.on('packet', (packet) => {
            this.log('parser :: on packet push to packets array.');
            packets.push(packet);
        });
        const work = () => {
            this.log('work :: getting next packet in queue');
            const packet = packets.shift();
            if (packet) {
                this.log('work :: packet pulled from queue');
                (0, handlers_1.default)(this, packet, nextTickWork);
            }
            else {
                this.log('work :: no packets in queue');
                const done = completeParse;
                completeParse = null;
                this.log('work :: done flag is %s', !!done);
                if (done)
                    done();
            }
        };
        const nextTickWork = () => {
            if (packets.length) {
                (0, shared_1.nextTick)(work);
            }
            else {
                const done = completeParse;
                completeParse = null;
                done();
            }
        };
        writable._write = (buf, enc, done) => {
            completeParse = done;
            this.log('writable stream :: parsing buffer');
            parser.parse(buf);
            work();
        };
        const streamErrorHandler = (error) => {
            this.log('streamErrorHandler :: error', error.message);
            if (error.code) {
                this.log('streamErrorHandler :: emitting error');
                this.emit('error', error);
            }
            else {
                this.noop(error);
            }
        };
        this.log('connect :: pipe stream to writable stream');
        this.stream.pipe(writable);
        this.stream.on('error', streamErrorHandler);
        this.stream.on('close', () => {
            this.log('(%s)stream :: on close', this.options.clientId);
            this._flushVolatile();
            this.log('stream: emit close to MqttClient');
            this.emit('close');
        });
        this.log('connect: sending packet `connect`');
        const connectPacket = {
            cmd: 'connect',
            protocolId: this.options.protocolId,
            protocolVersion: this.options.protocolVersion,
            clean: this.options.clean,
            clientId: this.options.clientId,
            keepalive: this.options.keepalive,
            username: this.options.username,
            password: this.options.password,
            properties: this.options.properties,
        };
        if (this.options.will) {
            connectPacket.will = Object.assign(Object.assign({}, this.options.will), { payload: (_a = this.options.will) === null || _a === void 0 ? void 0 : _a.payload });
        }
        if (this.topicAliasRecv) {
            if (!connectPacket.properties) {
                connectPacket.properties = {};
            }
            if (this.topicAliasRecv) {
                connectPacket.properties.topicAliasMaximum =
                    this.topicAliasRecv.max;
            }
        }
        this._writePacket(connectPacket);
        parser.on('error', this.emit.bind(this, 'error'));
        if (this.options.properties) {
            if (!this.options.properties.authenticationMethod &&
                this.options.properties.authenticationData) {
                this.end(() => this.emit('error', new Error('Packet has no Authentication Method')));
                return this;
            }
            if (this.options.properties.authenticationMethod &&
                this.options.authPacket &&
                typeof this.options.authPacket === 'object') {
                const authPacket = Object.assign({ cmd: 'auth', reasonCode: 0 }, this.options.authPacket);
                this._writePacket(authPacket);
            }
        }
        this.stream.setMaxListeners(1000);
        clearTimeout(this.connackTimer);
        this.connackTimer = setTimeout(() => {
            this.log('!!connectTimeout hit!! Calling _cleanUp with force `true`');
            this.emit('error', new Error('connack timeout'));
            this._cleanUp(true);
        }, this.options.connectTimeout);
        return this;
    }
    publish(topic, message, opts, callback) {
        this.log('publish :: message `%s` to topic `%s`', message, topic);
        const { options } = this;
        if (typeof opts === 'function') {
            callback = opts;
            opts = null;
        }
        opts = opts || {};
        const defaultOpts = {
            qos: 0,
            retain: false,
            dup: false,
        };
        opts = Object.assign(Object.assign({}, defaultOpts), opts);
        const { qos, retain, dup, properties, cbStorePut } = opts;
        if (this._checkDisconnecting(callback)) {
            return this;
        }
        const publishProc = () => {
            let messageId = 0;
            if (qos === 1 || qos === 2) {
                messageId = this._nextId();
                if (messageId === null) {
                    this.log('No messageId left');
                    return false;
                }
            }
            const packet = {
                cmd: 'publish',
                topic,
                payload: message,
                qos,
                retain,
                messageId,
                dup,
            };
            if (options.protocolVersion === 5) {
                packet.properties = properties;
            }
            this.log('publish :: qos', qos);
            switch (qos) {
                case 1:
                case 2:
                    this.outgoing[packet.messageId] = {
                        volatile: false,
                        cb: callback || this.noop,
                    };
                    this.log('MqttClient:publish: packet cmd: %s', packet.cmd);
                    this._sendPacket(packet, undefined, cbStorePut);
                    break;
                default:
                    this.log('MqttClient:publish: packet cmd: %s', packet.cmd);
                    this._sendPacket(packet, callback, cbStorePut);
                    break;
            }
            return true;
        };
        if (this._storeProcessing ||
            this._storeProcessingQueue.length > 0 ||
            !publishProc()) {
            this._storeProcessingQueue.push({
                invoke: publishProc,
                cbStorePut: opts.cbStorePut,
                callback,
            });
        }
        return this;
    }
    publishAsync(topic, message, opts) {
        return new Promise((resolve, reject) => {
            this.publish(topic, message, opts, (err, packet) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(packet);
                }
            });
        });
    }
    subscribe(topicObject, opts, callback) {
        const version = this.options.protocolVersion;
        if (typeof opts === 'function') {
            callback = opts;
        }
        callback = callback || this.noop;
        let resubscribe = false;
        let topicsList = [];
        if (typeof topicObject === 'string') {
            topicObject = [topicObject];
            topicsList = topicObject;
        }
        else if (Array.isArray(topicObject)) {
            topicsList = topicObject;
        }
        else if (typeof topicObject === 'object') {
            resubscribe = topicObject.resubscribe;
            delete topicObject.resubscribe;
            topicsList = Object.keys(topicObject);
        }
        const invalidTopic = validations.validateTopics(topicsList);
        if (invalidTopic !== null) {
            setImmediate(callback, new Error(`Invalid topic ${invalidTopic}`));
            return this;
        }
        if (this._checkDisconnecting(callback)) {
            this.log('subscribe: discconecting true');
            return this;
        }
        const defaultOpts = {
            qos: 0,
        };
        if (version === 5) {
            defaultOpts.nl = false;
            defaultOpts.rap = false;
            defaultOpts.rh = 0;
        }
        opts = Object.assign(Object.assign({}, defaultOpts), opts);
        const properties = opts.properties;
        const subs = [];
        const parseSub = (topic, subOptions) => {
            subOptions = (subOptions || opts);
            if (!Object.prototype.hasOwnProperty.call(this._resubscribeTopics, topic) ||
                this._resubscribeTopics[topic].qos < subOptions.qos ||
                resubscribe) {
                const currentOpts = {
                    topic,
                    qos: subOptions.qos,
                };
                if (version === 5) {
                    currentOpts.nl = subOptions.nl;
                    currentOpts.rap = subOptions.rap;
                    currentOpts.rh = subOptions.rh;
                    currentOpts.properties = properties;
                }
                this.log('subscribe: pushing topic `%s` and qos `%s` to subs list', currentOpts.topic, currentOpts.qos);
                subs.push(currentOpts);
            }
        };
        if (Array.isArray(topicObject)) {
            topicObject.forEach((topic) => {
                this.log('subscribe: array topic %s', topic);
                parseSub(topic);
            });
        }
        else {
            Object.keys(topicObject).forEach((topic) => {
                this.log('subscribe: object topic %s, %o', topic, topicObject[topic]);
                parseSub(topic, topicObject[topic]);
            });
        }
        if (!subs.length) {
            callback(null, []);
            return this;
        }
        const subscribeProc = () => {
            const messageId = this._nextId();
            if (messageId === null) {
                this.log('No messageId left');
                return false;
            }
            const packet = {
                cmd: 'subscribe',
                subscriptions: subs,
                messageId,
            };
            if (properties) {
                packet.properties = properties;
            }
            if (this.options.resubscribe) {
                this.log('subscribe :: resubscribe true');
                const topics = [];
                subs.forEach((sub) => {
                    if (this.options.reconnectPeriod > 0) {
                        const topic = { qos: sub.qos };
                        if (version === 5) {
                            topic.nl = sub.nl || false;
                            topic.rap = sub.rap || false;
                            topic.rh = sub.rh || 0;
                            topic.properties = sub.properties;
                        }
                        this._resubscribeTopics[sub.topic] = topic;
                        topics.push(sub.topic);
                    }
                });
                this.messageIdToTopic[packet.messageId] = topics;
            }
            this.outgoing[packet.messageId] = {
                volatile: true,
                cb(err, packet2) {
                    if (!err) {
                        const { granted } = packet2;
                        for (let i = 0; i < granted.length; i += 1) {
                            subs[i].qos = granted[i];
                        }
                    }
                    callback(err, subs);
                },
            };
            this.log('subscribe :: call _sendPacket');
            this._sendPacket(packet);
            return true;
        };
        if (this._storeProcessing ||
            this._storeProcessingQueue.length > 0 ||
            !subscribeProc()) {
            this._storeProcessingQueue.push({
                invoke: subscribeProc,
                callback,
            });
        }
        return this;
    }
    subscribeAsync(topicObject, opts) {
        return new Promise((resolve, reject) => {
            this.subscribe(topicObject, opts, (err, granted) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(granted);
                }
            });
        });
    }
    unsubscribe(topic, opts, callback) {
        if (typeof topic === 'string') {
            topic = [topic];
        }
        if (typeof opts === 'function') {
            callback = opts;
        }
        callback = callback || this.noop;
        const invalidTopic = validations.validateTopics(topic);
        if (invalidTopic !== null) {
            setImmediate(callback, new Error(`Invalid topic ${invalidTopic}`));
            return this;
        }
        if (this._checkDisconnecting(callback)) {
            return this;
        }
        const unsubscribeProc = () => {
            const messageId = this._nextId();
            if (messageId === null) {
                this.log('No messageId left');
                return false;
            }
            const packet = {
                cmd: 'unsubscribe',
                messageId,
                unsubscriptions: [],
            };
            if (typeof topic === 'string') {
                packet.unsubscriptions = [topic];
            }
            else if (Array.isArray(topic)) {
                packet.unsubscriptions = topic;
            }
            if (this.options.resubscribe) {
                packet.unsubscriptions.forEach((topic2) => {
                    delete this._resubscribeTopics[topic2];
                });
            }
            if (typeof opts === 'object' && opts.properties) {
                packet.properties = opts.properties;
            }
            this.outgoing[packet.messageId] = {
                volatile: true,
                cb: callback,
            };
            this.log('unsubscribe: call _sendPacket');
            this._sendPacket(packet);
            return true;
        };
        if (this._storeProcessing ||
            this._storeProcessingQueue.length > 0 ||
            !unsubscribeProc()) {
            this._storeProcessingQueue.push({
                invoke: unsubscribeProc,
                callback,
            });
        }
        return this;
    }
    unsubscribeAsync(topic, opts) {
        return new Promise((resolve, reject) => {
            this.unsubscribe(topic, opts, (err, packet) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(packet);
                }
            });
        });
    }
    end(force, opts, cb) {
        this.log('end :: (%s)', this.options.clientId);
        if (force == null || typeof force !== 'boolean') {
            cb = cb || opts;
            opts = force;
            force = false;
        }
        if (typeof opts !== 'object') {
            cb = cb || opts;
            opts = null;
        }
        this.log('end :: cb? %s', !!cb);
        if (!cb || typeof cb !== 'function') {
            cb = this.noop;
        }
        const closeStores = () => {
            this.log('end :: closeStores: closing incoming and outgoing stores');
            this.disconnected = true;
            this.incomingStore.close((e1) => {
                this.outgoingStore.close((e2) => {
                    this.log('end :: closeStores: emitting end');
                    this.emit('end');
                    if (cb) {
                        const err = e1 || e2;
                        this.log('end :: closeStores: invoking callback with args');
                        cb(err);
                    }
                });
            });
            if (this._deferredReconnect) {
                this._deferredReconnect();
            }
        };
        const finish = () => {
            this.log('end :: (%s) :: finish :: calling _cleanUp with force %s', this.options.clientId, force);
            this._cleanUp(force, () => {
                this.log('end :: finish :: calling process.nextTick on closeStores');
                (0, shared_1.nextTick)(closeStores);
            }, opts);
        };
        if (this.disconnecting) {
            cb();
            return this;
        }
        this._clearReconnect();
        this.disconnecting = true;
        if (!force && Object.keys(this.outgoing).length > 0) {
            this.log('end :: (%s) :: calling finish in 10ms once outgoing is empty', this.options.clientId);
            this.once('outgoingEmpty', setTimeout.bind(null, finish, 10));
        }
        else {
            this.log('end :: (%s) :: immediately calling finish', this.options.clientId);
            finish();
        }
        return this;
    }
    endAsync(force, opts) {
        return new Promise((resolve, reject) => {
            this.end(force, opts, (err) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
    removeOutgoingMessage(messageId) {
        if (this.outgoing[messageId]) {
            const { cb } = this.outgoing[messageId];
            this._removeOutgoingAndStoreMessage(messageId, () => {
                cb(new Error('Message removed'));
            });
        }
        return this;
    }
    reconnect(opts) {
        this.log('client reconnect');
        const f = () => {
            if (opts) {
                this.options.incomingStore = opts.incomingStore;
                this.options.outgoingStore = opts.outgoingStore;
            }
            else {
                this.options.incomingStore = null;
                this.options.outgoingStore = null;
            }
            this.incomingStore = this.options.incomingStore || new store_1.default();
            this.outgoingStore = this.options.outgoingStore || new store_1.default();
            this.disconnecting = false;
            this.disconnected = false;
            this._deferredReconnect = null;
            this._reconnect();
        };
        if (this.disconnecting && !this.disconnected) {
            this._deferredReconnect = f;
        }
        else {
            f();
        }
        return this;
    }
    _flushVolatile() {
        if (this.outgoing) {
            this.log('_flushVolatile :: deleting volatile messages from the queue and setting their callbacks as error function');
            Object.keys(this.outgoing).forEach((messageId) => {
                if (this.outgoing[messageId].volatile &&
                    typeof this.outgoing[messageId].cb === 'function') {
                    this.outgoing[messageId].cb(new Error('Connection closed'));
                    delete this.outgoing[messageId];
                }
            });
        }
    }
    _flush() {
        if (this.outgoing) {
            this.log('_flush: queue exists? %b', !!this.outgoing);
            Object.keys(this.outgoing).forEach((messageId) => {
                if (typeof this.outgoing[messageId].cb === 'function') {
                    this.outgoing[messageId].cb(new Error('Connection closed'));
                    delete this.outgoing[messageId];
                }
            });
        }
    }
    _removeTopicAliasAndRecoverTopicName(packet) {
        let alias;
        if (packet.properties) {
            alias = packet.properties.topicAlias;
        }
        let topic = packet.topic.toString();
        this.log('_removeTopicAliasAndRecoverTopicName :: alias %d, topic %o', alias, topic);
        if (topic.length === 0) {
            if (typeof alias === 'undefined') {
                return new Error('Unregistered Topic Alias');
            }
            topic = this.topicAliasSend.getTopicByAlias(alias);
            if (typeof topic === 'undefined') {
                return new Error('Unregistered Topic Alias');
            }
            packet.topic = topic;
        }
        if (alias) {
            delete packet.properties.topicAlias;
        }
    }
    _checkDisconnecting(callback) {
        if (this.disconnecting) {
            if (callback && callback !== this.noop) {
                callback(new Error('client disconnecting'));
            }
            else {
                this.emit('error', new Error('client disconnecting'));
            }
        }
        return this.disconnecting;
    }
    _reconnect() {
        this.log('_reconnect: emitting reconnect to client');
        this.emit('reconnect');
        if (this.connected) {
            this.end(() => {
                this.connect();
            });
            this.log('client already connected. disconnecting first.');
        }
        else {
            this.log('_reconnect: calling connect');
            this.connect();
        }
    }
    _setupReconnect() {
        if (!this.disconnecting &&
            !this.reconnectTimer &&
            this.options.reconnectPeriod > 0) {
            if (!this.reconnecting) {
                this.log('_setupReconnect :: emit `offline` state');
                this.emit('offline');
                this.log('_setupReconnect :: set `reconnecting` to `true`');
                this.reconnecting = true;
            }
            this.log('_setupReconnect :: setting reconnectTimer for %d ms', this.options.reconnectPeriod);
            this.reconnectTimer = setInterval(() => {
                this.log('reconnectTimer :: reconnect triggered!');
                this._reconnect();
            }, this.options.reconnectPeriod);
        }
        else {
            this.log('_setupReconnect :: doing nothing...');
        }
    }
    _clearReconnect() {
        this.log('_clearReconnect : clearing reconnect timer');
        if (this.reconnectTimer) {
            clearInterval(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }
    _cleanUp(forced, done, opts = {}) {
        if (done) {
            this.log('_cleanUp :: done callback provided for on stream close');
            this.stream.on('close', done);
        }
        this.log('_cleanUp :: forced? %s', forced);
        if (forced) {
            if (this.options.reconnectPeriod === 0 && this.options.clean) {
                this._flush();
            }
            this.log('_cleanUp :: (%s) :: destroying stream', this.options.clientId);
            this.stream.destroy();
        }
        else {
            const packet = Object.assign({ cmd: 'disconnect' }, opts);
            this.log('_cleanUp :: (%s) :: call _sendPacket with disconnect packet', this.options.clientId);
            this._sendPacket(packet, () => {
                this.log('_cleanUp :: (%s) :: destroying stream', this.options.clientId);
                setImmediate(() => {
                    this.stream.end(() => {
                        this.log('_cleanUp :: (%s) :: stream destroyed', this.options.clientId);
                    });
                });
            });
        }
        if (!this.disconnecting && !this.reconnecting) {
            this.log('_cleanUp :: client not disconnecting/reconnecting. Clearing and resetting reconnect.');
            this._clearReconnect();
            this._setupReconnect();
        }
        this._destroyKeepaliveManager();
        if (done && !this.connected) {
            this.log('_cleanUp :: (%s) :: removing stream `done` callback `close` listener', this.options.clientId);
            this.stream.removeListener('close', done);
            done();
        }
    }
    _storeAndSend(packet, cb, cbStorePut) {
        this.log('storeAndSend :: store packet with cmd %s to outgoingStore', packet.cmd);
        let storePacket = packet;
        let err;
        if (storePacket.cmd === 'publish') {
            storePacket = (0, default_1.default)(packet);
            err = this._removeTopicAliasAndRecoverTopicName(storePacket);
            if (err) {
                return cb && cb(err);
            }
        }
        this.outgoingStore.put(storePacket, (err2) => {
            if (err2) {
                return cb && cb(err2);
            }
            cbStorePut();
            this._writePacket(packet, cb);
        });
    }
    _applyTopicAlias(packet) {
        if (this.options.protocolVersion === 5) {
            if (packet.cmd === 'publish') {
                let alias;
                if (packet.properties) {
                    alias = packet.properties.topicAlias;
                }
                const topic = packet.topic.toString();
                if (this.topicAliasSend) {
                    if (alias) {
                        if (topic.length !== 0) {
                            this.log('applyTopicAlias :: register topic: %s - alias: %d', topic, alias);
                            if (!this.topicAliasSend.put(topic, alias)) {
                                this.log('applyTopicAlias :: error out of range. topic: %s - alias: %d', topic, alias);
                                return new Error('Sending Topic Alias out of range');
                            }
                        }
                    }
                    else if (topic.length !== 0) {
                        if (this.options.autoAssignTopicAlias) {
                            alias = this.topicAliasSend.getAliasByTopic(topic);
                            if (alias) {
                                packet.topic = '';
                                packet.properties = Object.assign(Object.assign({}, packet.properties), { topicAlias: alias });
                                this.log('applyTopicAlias :: auto assign(use) topic: %s - alias: %d', topic, alias);
                            }
                            else {
                                alias = this.topicAliasSend.getLruAlias();
                                this.topicAliasSend.put(topic, alias);
                                packet.properties = Object.assign(Object.assign({}, packet.properties), { topicAlias: alias });
                                this.log('applyTopicAlias :: auto assign topic: %s - alias: %d', topic, alias);
                            }
                        }
                        else if (this.options.autoUseTopicAlias) {
                            alias = this.topicAliasSend.getAliasByTopic(topic);
                            if (alias) {
                                packet.topic = '';
                                packet.properties = Object.assign(Object.assign({}, packet.properties), { topicAlias: alias });
                                this.log('applyTopicAlias :: auto use topic: %s - alias: %d', topic, alias);
                            }
                        }
                    }
                }
                else if (alias) {
                    this.log('applyTopicAlias :: error out of range. topic: %s - alias: %d', topic, alias);
                    return new Error('Sending Topic Alias out of range');
                }
            }
        }
    }
    _noop(err) {
        this.log('noop ::', err);
    }
    _writePacket(packet, cb) {
        this.log('_writePacket :: packet: %O', packet);
        this.log('_writePacket :: emitting `packetsend`');
        this.emit('packetsend', packet);
        this.log('_writePacket :: writing to stream');
        const result = mqtt_packet_1.default.writeToStream(packet, this.stream, this.options);
        this.log('_writePacket :: writeToStream result %s', result);
        if (!result && cb && cb !== this.noop) {
            this.log('_writePacket :: handle events on `drain` once through callback.');
            this.stream.once('drain', cb);
        }
        else if (cb) {
            this.log('_writePacket :: invoking cb');
            cb();
        }
    }
    _sendPacket(packet, cb, cbStorePut, noStore) {
        this.log('_sendPacket :: (%s) ::  start', this.options.clientId);
        cbStorePut = cbStorePut || this.noop;
        cb = cb || this.noop;
        const err = this._applyTopicAlias(packet);
        if (err) {
            cb(err);
            return;
        }
        if (!this.connected) {
            if (packet.cmd === 'auth') {
                this._writePacket(packet, cb);
                return;
            }
            this.log('_sendPacket :: client not connected. Storing packet offline.');
            this._storePacket(packet, cb, cbStorePut);
            return;
        }
        if (noStore) {
            this._writePacket(packet, cb);
            return;
        }
        switch (packet.cmd) {
            case 'publish':
                break;
            case 'pubrel':
                this._storeAndSend(packet, cb, cbStorePut);
                return;
            default:
                this._writePacket(packet, cb);
                return;
        }
        switch (packet.qos) {
            case 2:
            case 1:
                this._storeAndSend(packet, cb, cbStorePut);
                break;
            case 0:
            default:
                this._writePacket(packet, cb);
                break;
        }
        this.log('_sendPacket :: (%s) ::  end', this.options.clientId);
    }
    _storePacket(packet, cb, cbStorePut) {
        this.log('_storePacket :: packet: %o', packet);
        this.log('_storePacket :: cb? %s', !!cb);
        cbStorePut = cbStorePut || this.noop;
        let storePacket = packet;
        if (storePacket.cmd === 'publish') {
            storePacket = (0, default_1.default)(packet);
            const err = this._removeTopicAliasAndRecoverTopicName(storePacket);
            if (err) {
                return cb && cb(err);
            }
        }
        const qos = storePacket.qos || 0;
        if ((qos === 0 && this.queueQoSZero) || storePacket.cmd !== 'publish') {
            this.queue.push({ packet: storePacket, cb });
        }
        else if (qos > 0) {
            cb = this.outgoing[storePacket.messageId]
                ? this.outgoing[storePacket.messageId].cb
                : null;
            this.outgoingStore.put(storePacket, (err) => {
                if (err) {
                    return cb && cb(err);
                }
                cbStorePut();
            });
        }
        else if (cb) {
            cb(new Error('No connection to broker'));
        }
    }
    _setupKeepaliveManager() {
        this.log('_setupKeepaliveManager :: keepalive %d (seconds)', this.options.keepalive);
        if (!this.keepaliveManager && this.options.keepalive) {
            this.keepaliveManager = new KeepaliveManager_1.default(this, this.options.timerVariant);
        }
    }
    _destroyKeepaliveManager() {
        if (this.keepaliveManager) {
            this.log('_destroyKeepaliveManager :: destroying keepalive manager');
            this.keepaliveManager.destroy();
            this.keepaliveManager = null;
        }
    }
    reschedulePing() {
        if (this.keepaliveManager &&
            this.options.keepalive &&
            this.options.reschedulePings) {
            this._reschedulePing();
        }
    }
    _reschedulePing() {
        this.log('_reschedulePing :: rescheduling ping');
        this.keepaliveManager.reschedule();
    }
    sendPing() {
        this.log('_sendPing :: sending pingreq');
        this._sendPacket({ cmd: 'pingreq' });
    }
    onKeepaliveTimeout() {
        this.emit('error', new Error('Keepalive timeout'));
        this.log('onKeepaliveTimeout :: calling _cleanUp with force true');
        this._cleanUp(true);
    }
    _resubscribe() {
        this.log('_resubscribe');
        const _resubscribeTopicsKeys = Object.keys(this._resubscribeTopics);
        if (!this._firstConnection &&
            (this.options.clean ||
                (this.options.protocolVersion >= 4 &&
                    !this.connackPacket.sessionPresent)) &&
            _resubscribeTopicsKeys.length > 0) {
            if (this.options.resubscribe) {
                if (this.options.protocolVersion === 5) {
                    this.log('_resubscribe: protocolVersion 5');
                    for (let topicI = 0; topicI < _resubscribeTopicsKeys.length; topicI++) {
                        const resubscribeTopic = {};
                        resubscribeTopic[_resubscribeTopicsKeys[topicI]] =
                            this._resubscribeTopics[_resubscribeTopicsKeys[topicI]];
                        resubscribeTopic.resubscribe = true;
                        this.subscribe(resubscribeTopic, {
                            properties: resubscribeTopic[_resubscribeTopicsKeys[topicI]]
                                .properties,
                        });
                    }
                }
                else {
                    this._resubscribeTopics.resubscribe = true;
                    this.subscribe(this._resubscribeTopics);
                }
            }
            else {
                this._resubscribeTopics = {};
            }
        }
        this._firstConnection = false;
    }
    _onConnect(packet) {
        if (this.disconnected) {
            this.emit('connect', packet);
            return;
        }
        this.connackPacket = packet;
        this.messageIdProvider.clear();
        this._setupKeepaliveManager();
        this.connected = true;
        const startStreamProcess = () => {
            let outStore = this.outgoingStore.createStream();
            const remove = () => {
                outStore.destroy();
                outStore = null;
                this._flushStoreProcessingQueue();
                clearStoreProcessing();
            };
            const clearStoreProcessing = () => {
                this._storeProcessing = false;
                this._packetIdsDuringStoreProcessing = {};
            };
            this.once('close', remove);
            outStore.on('error', (err) => {
                clearStoreProcessing();
                this._flushStoreProcessingQueue();
                this.removeListener('close', remove);
                this.emit('error', err);
            });
            const storeDeliver = () => {
                if (!outStore) {
                    return;
                }
                const packet2 = outStore.read(1);
                let cb;
                if (!packet2) {
                    outStore.once('readable', storeDeliver);
                    return;
                }
                this._storeProcessing = true;
                if (this._packetIdsDuringStoreProcessing[packet2.messageId]) {
                    storeDeliver();
                    return;
                }
                if (!this.disconnecting && !this.reconnectTimer) {
                    cb = this.outgoing[packet2.messageId]
                        ? this.outgoing[packet2.messageId].cb
                        : null;
                    this.outgoing[packet2.messageId] = {
                        volatile: false,
                        cb(err, status) {
                            if (cb) {
                                cb(err, status);
                            }
                            storeDeliver();
                        },
                    };
                    this._packetIdsDuringStoreProcessing[packet2.messageId] =
                        true;
                    if (this.messageIdProvider.register(packet2.messageId)) {
                        this._sendPacket(packet2, undefined, undefined, true);
                    }
                    else {
                        this.log('messageId: %d has already used.', packet2.messageId);
                    }
                }
                else if (outStore.destroy) {
                    outStore.destroy();
                }
            };
            outStore.on('end', () => {
                let allProcessed = true;
                for (const id in this._packetIdsDuringStoreProcessing) {
                    if (!this._packetIdsDuringStoreProcessing[id]) {
                        allProcessed = false;
                        break;
                    }
                }
                this.removeListener('close', remove);
                if (allProcessed) {
                    clearStoreProcessing();
                    this._invokeAllStoreProcessingQueue();
                    this.emit('connect', packet);
                }
                else {
                    startStreamProcess();
                }
            });
            storeDeliver();
        };
        startStreamProcess();
    }
    _invokeStoreProcessingQueue() {
        if (!this._storeProcessing && this._storeProcessingQueue.length > 0) {
            const f = this._storeProcessingQueue[0];
            if (f && f.invoke()) {
                this._storeProcessingQueue.shift();
                return true;
            }
        }
        return false;
    }
    _invokeAllStoreProcessingQueue() {
        while (this._invokeStoreProcessingQueue()) {
        }
    }
    _flushStoreProcessingQueue() {
        for (const f of this._storeProcessingQueue) {
            if (f.cbStorePut)
                f.cbStorePut(new Error('Connection closed'));
            if (f.callback)
                f.callback(new Error('Connection closed'));
        }
        this._storeProcessingQueue.splice(0);
    }
    _removeOutgoingAndStoreMessage(messageId, cb) {
        delete this.outgoing[messageId];
        this.outgoingStore.del({ messageId }, (err, packet) => {
            cb(err, packet);
            this.messageIdProvider.deallocate(messageId);
            this._invokeStoreProcessingQueue();
        });
    }
}
MqttClient.VERSION = shared_1.MQTTJS_VERSION;
exports.default = MqttClient;
//# sourceMappingURL=client.js.map