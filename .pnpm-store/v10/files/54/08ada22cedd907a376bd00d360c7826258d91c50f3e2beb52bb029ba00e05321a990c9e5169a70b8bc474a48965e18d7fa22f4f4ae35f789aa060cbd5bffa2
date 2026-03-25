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
var _PubSub_instances, _a, _PubSub_channelsArray, _PubSub_listenersSet, _PubSub_subscribing, _PubSub_isActive, _PubSub_listeners, _PubSub_extendChannelListeners, _PubSub_unsubscribeCommand, _PubSub_updateIsActive, _PubSub_emitPubSubMessage;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PubSub = exports.PubSubType = void 0;
var PubSubType;
(function (PubSubType) {
    PubSubType["CHANNELS"] = "CHANNELS";
    PubSubType["PATTERNS"] = "PATTERNS";
    PubSubType["SHARDED"] = "SHARDED";
})(PubSubType || (exports.PubSubType = PubSubType = {}));
const COMMANDS = {
    [PubSubType.CHANNELS]: {
        subscribe: Buffer.from('subscribe'),
        unsubscribe: Buffer.from('unsubscribe'),
        message: Buffer.from('message')
    },
    [PubSubType.PATTERNS]: {
        subscribe: Buffer.from('psubscribe'),
        unsubscribe: Buffer.from('punsubscribe'),
        message: Buffer.from('pmessage')
    },
    [PubSubType.SHARDED]: {
        subscribe: Buffer.from('ssubscribe'),
        unsubscribe: Buffer.from('sunsubscribe'),
        message: Buffer.from('smessage')
    }
};
class PubSub {
    constructor() {
        _PubSub_instances.add(this);
        _PubSub_subscribing.set(this, 0);
        _PubSub_isActive.set(this, false);
        _PubSub_listeners.set(this, {
            [PubSubType.CHANNELS]: new Map(),
            [PubSubType.PATTERNS]: new Map(),
            [PubSubType.SHARDED]: new Map()
        });
    }
    static isStatusReply(reply) {
        return (COMMANDS[PubSubType.CHANNELS].subscribe.equals(reply[0]) ||
            COMMANDS[PubSubType.CHANNELS].unsubscribe.equals(reply[0]) ||
            COMMANDS[PubSubType.PATTERNS].subscribe.equals(reply[0]) ||
            COMMANDS[PubSubType.PATTERNS].unsubscribe.equals(reply[0]) ||
            COMMANDS[PubSubType.SHARDED].subscribe.equals(reply[0]));
    }
    static isShardedUnsubscribe(reply) {
        return COMMANDS[PubSubType.SHARDED].unsubscribe.equals(reply[0]);
    }
    get isActive() {
        return __classPrivateFieldGet(this, _PubSub_isActive, "f");
    }
    subscribe(type, channels, listener, returnBuffers) {
        var _b;
        const args = [COMMANDS[type].subscribe], channelsArray = __classPrivateFieldGet(_a, _a, "m", _PubSub_channelsArray).call(_a, channels);
        for (const channel of channelsArray) {
            let channelListeners = __classPrivateFieldGet(this, _PubSub_listeners, "f")[type].get(channel);
            if (!channelListeners || channelListeners.unsubscribing) {
                args.push(channel);
            }
        }
        if (args.length === 1) {
            // all channels are already subscribed, add listeners without issuing a command
            for (const channel of channelsArray) {
                __classPrivateFieldGet(_a, _a, "m", _PubSub_listenersSet).call(_a, __classPrivateFieldGet(this, _PubSub_listeners, "f")[type].get(channel), returnBuffers).add(listener);
            }
            return;
        }
        __classPrivateFieldSet(this, _PubSub_isActive, true, "f");
        __classPrivateFieldSet(this, _PubSub_subscribing, (_b = __classPrivateFieldGet(this, _PubSub_subscribing, "f"), _b++, _b), "f");
        return {
            args,
            channelsCounter: args.length - 1,
            resolve: () => {
                var _b;
                __classPrivateFieldSet(this, _PubSub_subscribing, (_b = __classPrivateFieldGet(this, _PubSub_subscribing, "f"), _b--, _b), "f");
                for (const channel of channelsArray) {
                    let listeners = __classPrivateFieldGet(this, _PubSub_listeners, "f")[type].get(channel);
                    if (!listeners) {
                        listeners = {
                            unsubscribing: false,
                            buffers: new Set(),
                            strings: new Set()
                        };
                        __classPrivateFieldGet(this, _PubSub_listeners, "f")[type].set(channel, listeners);
                    }
                    __classPrivateFieldGet(_a, _a, "m", _PubSub_listenersSet).call(_a, listeners, returnBuffers).add(listener);
                }
            },
            reject: () => {
                var _b;
                __classPrivateFieldSet(this, _PubSub_subscribing, (_b = __classPrivateFieldGet(this, _PubSub_subscribing, "f"), _b--, _b), "f");
                __classPrivateFieldGet(this, _PubSub_instances, "m", _PubSub_updateIsActive).call(this);
            }
        };
    }
    extendChannelListeners(type, channel, listeners) {
        var _b;
        if (!__classPrivateFieldGet(this, _PubSub_instances, "m", _PubSub_extendChannelListeners).call(this, type, channel, listeners))
            return;
        __classPrivateFieldSet(this, _PubSub_isActive, true, "f");
        __classPrivateFieldSet(this, _PubSub_subscribing, (_b = __classPrivateFieldGet(this, _PubSub_subscribing, "f"), _b++, _b), "f");
        return {
            args: [
                COMMANDS[type].subscribe,
                channel
            ],
            channelsCounter: 1,
            resolve: () => { var _b, _c; return __classPrivateFieldSet(this, _PubSub_subscribing, (_c = __classPrivateFieldGet(this, _PubSub_subscribing, "f"), _b = _c--, _c), "f"), _b; },
            reject: () => {
                var _b;
                __classPrivateFieldSet(this, _PubSub_subscribing, (_b = __classPrivateFieldGet(this, _PubSub_subscribing, "f"), _b--, _b), "f");
                __classPrivateFieldGet(this, _PubSub_instances, "m", _PubSub_updateIsActive).call(this);
            }
        };
    }
    extendTypeListeners(type, listeners) {
        var _b;
        const args = [COMMANDS[type].subscribe];
        for (const [channel, channelListeners] of listeners) {
            if (__classPrivateFieldGet(this, _PubSub_instances, "m", _PubSub_extendChannelListeners).call(this, type, channel, channelListeners)) {
                args.push(channel);
            }
        }
        if (args.length === 1)
            return;
        __classPrivateFieldSet(this, _PubSub_isActive, true, "f");
        __classPrivateFieldSet(this, _PubSub_subscribing, (_b = __classPrivateFieldGet(this, _PubSub_subscribing, "f"), _b++, _b), "f");
        return {
            args,
            channelsCounter: args.length - 1,
            resolve: () => { var _b, _c; return __classPrivateFieldSet(this, _PubSub_subscribing, (_c = __classPrivateFieldGet(this, _PubSub_subscribing, "f"), _b = _c--, _c), "f"), _b; },
            reject: () => {
                var _b;
                __classPrivateFieldSet(this, _PubSub_subscribing, (_b = __classPrivateFieldGet(this, _PubSub_subscribing, "f"), _b--, _b), "f");
                __classPrivateFieldGet(this, _PubSub_instances, "m", _PubSub_updateIsActive).call(this);
            }
        };
    }
    unsubscribe(type, channels, listener, returnBuffers) {
        const listeners = __classPrivateFieldGet(this, _PubSub_listeners, "f")[type];
        if (!channels) {
            return __classPrivateFieldGet(this, _PubSub_instances, "m", _PubSub_unsubscribeCommand).call(this, [COMMANDS[type].unsubscribe], 
            // cannot use `this.#subscribed` because there might be some `SUBSCRIBE` commands in the queue
            // cannot use `this.#subscribed + this.#subscribing` because some `SUBSCRIBE` commands might fail
            NaN, () => listeners.clear());
        }
        const channelsArray = __classPrivateFieldGet(_a, _a, "m", _PubSub_channelsArray).call(_a, channels);
        if (!listener) {
            return __classPrivateFieldGet(this, _PubSub_instances, "m", _PubSub_unsubscribeCommand).call(this, [COMMANDS[type].unsubscribe, ...channelsArray], channelsArray.length, () => {
                for (const channel of channelsArray) {
                    listeners.delete(channel);
                }
            });
        }
        const args = [COMMANDS[type].unsubscribe];
        for (const channel of channelsArray) {
            const sets = listeners.get(channel);
            if (sets) {
                let current, other;
                if (returnBuffers) {
                    current = sets.buffers;
                    other = sets.strings;
                }
                else {
                    current = sets.strings;
                    other = sets.buffers;
                }
                const currentSize = current.has(listener) ? current.size - 1 : current.size;
                if (currentSize !== 0 || other.size !== 0)
                    continue;
                sets.unsubscribing = true;
            }
            args.push(channel);
        }
        if (args.length === 1) {
            // all channels has other listeners,
            // delete the listeners without issuing a command
            for (const channel of channelsArray) {
                __classPrivateFieldGet(_a, _a, "m", _PubSub_listenersSet).call(_a, listeners.get(channel), returnBuffers).delete(listener);
            }
            return;
        }
        return __classPrivateFieldGet(this, _PubSub_instances, "m", _PubSub_unsubscribeCommand).call(this, args, args.length - 1, () => {
            for (const channel of channelsArray) {
                const sets = listeners.get(channel);
                if (!sets)
                    continue;
                (returnBuffers ? sets.buffers : sets.strings).delete(listener);
                if (sets.buffers.size === 0 && sets.strings.size === 0) {
                    listeners.delete(channel);
                }
            }
        });
    }
    reset() {
        __classPrivateFieldSet(this, _PubSub_isActive, false, "f");
        __classPrivateFieldSet(this, _PubSub_subscribing, 0, "f");
    }
    resubscribe() {
        var _b;
        const commands = [];
        for (const [type, listeners] of Object.entries(__classPrivateFieldGet(this, _PubSub_listeners, "f"))) {
            if (!listeners.size)
                continue;
            __classPrivateFieldSet(this, _PubSub_isActive, true, "f");
            __classPrivateFieldSet(this, _PubSub_subscribing, (_b = __classPrivateFieldGet(this, _PubSub_subscribing, "f"), _b++, _b), "f");
            const callback = () => { var _b, _c; return __classPrivateFieldSet(this, _PubSub_subscribing, (_c = __classPrivateFieldGet(this, _PubSub_subscribing, "f"), _b = _c--, _c), "f"), _b; };
            commands.push({
                args: [
                    COMMANDS[type].subscribe,
                    ...listeners.keys()
                ],
                channelsCounter: listeners.size,
                resolve: callback,
                reject: callback
            });
        }
        return commands;
    }
    handleMessageReply(reply) {
        if (COMMANDS[PubSubType.CHANNELS].message.equals(reply[0])) {
            __classPrivateFieldGet(this, _PubSub_instances, "m", _PubSub_emitPubSubMessage).call(this, PubSubType.CHANNELS, reply[2], reply[1]);
            return true;
        }
        else if (COMMANDS[PubSubType.PATTERNS].message.equals(reply[0])) {
            __classPrivateFieldGet(this, _PubSub_instances, "m", _PubSub_emitPubSubMessage).call(this, PubSubType.PATTERNS, reply[3], reply[2], reply[1]);
            return true;
        }
        else if (COMMANDS[PubSubType.SHARDED].message.equals(reply[0])) {
            __classPrivateFieldGet(this, _PubSub_instances, "m", _PubSub_emitPubSubMessage).call(this, PubSubType.SHARDED, reply[2], reply[1]);
            return true;
        }
        return false;
    }
    removeShardedListeners(channel) {
        const listeners = __classPrivateFieldGet(this, _PubSub_listeners, "f")[PubSubType.SHARDED].get(channel);
        __classPrivateFieldGet(this, _PubSub_listeners, "f")[PubSubType.SHARDED].delete(channel);
        __classPrivateFieldGet(this, _PubSub_instances, "m", _PubSub_updateIsActive).call(this);
        return listeners;
    }
    getTypeListeners(type) {
        return __classPrivateFieldGet(this, _PubSub_listeners, "f")[type];
    }
}
exports.PubSub = PubSub;
_a = PubSub, _PubSub_subscribing = new WeakMap(), _PubSub_isActive = new WeakMap(), _PubSub_listeners = new WeakMap(), _PubSub_instances = new WeakSet(), _PubSub_channelsArray = function _PubSub_channelsArray(channels) {
    return (Array.isArray(channels) ? channels : [channels]);
}, _PubSub_listenersSet = function _PubSub_listenersSet(listeners, returnBuffers) {
    return (returnBuffers ? listeners.buffers : listeners.strings);
}, _PubSub_extendChannelListeners = function _PubSub_extendChannelListeners(type, channel, listeners) {
    const existingListeners = __classPrivateFieldGet(this, _PubSub_listeners, "f")[type].get(channel);
    if (!existingListeners) {
        __classPrivateFieldGet(this, _PubSub_listeners, "f")[type].set(channel, listeners);
        return true;
    }
    for (const listener of listeners.buffers) {
        existingListeners.buffers.add(listener);
    }
    for (const listener of listeners.strings) {
        existingListeners.strings.add(listener);
    }
    return false;
}, _PubSub_unsubscribeCommand = function _PubSub_unsubscribeCommand(args, channelsCounter, removeListeners) {
    return {
        args,
        channelsCounter,
        resolve: () => {
            removeListeners();
            __classPrivateFieldGet(this, _PubSub_instances, "m", _PubSub_updateIsActive).call(this);
        },
        reject: undefined // use the same structure as `subscribe`
    };
}, _PubSub_updateIsActive = function _PubSub_updateIsActive() {
    __classPrivateFieldSet(this, _PubSub_isActive, (__classPrivateFieldGet(this, _PubSub_listeners, "f")[PubSubType.CHANNELS].size !== 0 ||
        __classPrivateFieldGet(this, _PubSub_listeners, "f")[PubSubType.PATTERNS].size !== 0 ||
        __classPrivateFieldGet(this, _PubSub_listeners, "f")[PubSubType.SHARDED].size !== 0 ||
        __classPrivateFieldGet(this, _PubSub_subscribing, "f") !== 0), "f");
}, _PubSub_emitPubSubMessage = function _PubSub_emitPubSubMessage(type, message, channel, pattern) {
    const keyString = (pattern ?? channel).toString(), listeners = __classPrivateFieldGet(this, _PubSub_listeners, "f")[type].get(keyString);
    if (!listeners)
        return;
    for (const listener of listeners.buffers) {
        listener(message, channel);
    }
    if (!listeners.strings.size)
        return;
    const channelString = pattern ? channel.toString() : keyString, messageString = channelString === '__redis__:invalidate' ?
        // https://github.com/redis/redis/pull/7469
        // https://github.com/redis/redis/issues/7463
        (message === null ? null : message.map(x => x.toString())) :
        message.toString();
    for (const listener of listeners.strings) {
        listener(messageString, channelString);
    }
};
