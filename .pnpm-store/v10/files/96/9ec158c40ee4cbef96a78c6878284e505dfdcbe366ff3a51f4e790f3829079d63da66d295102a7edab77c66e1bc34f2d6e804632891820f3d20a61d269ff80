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
var _RedisCommandsQueue_instances, _a, _RedisCommandsQueue_flushQueue, _RedisCommandsQueue_maxLength, _RedisCommandsQueue_waitingToBeSent, _RedisCommandsQueue_waitingForReply, _RedisCommandsQueue_onShardedChannelMoved, _RedisCommandsQueue_pubSub, _RedisCommandsQueue_chainInExecution, _RedisCommandsQueue_decoder, _RedisCommandsQueue_pushPubSubCommand;
Object.defineProperty(exports, "__esModule", { value: true });
const LinkedList = require("yallist");
const errors_1 = require("../errors");
const decoder_1 = require("./RESP2/decoder");
const encoder_1 = require("./RESP2/encoder");
const pub_sub_1 = require("./pub-sub");
const PONG = Buffer.from('pong');
class RedisCommandsQueue {
    get isPubSubActive() {
        return __classPrivateFieldGet(this, _RedisCommandsQueue_pubSub, "f").isActive;
    }
    constructor(maxLength, onShardedChannelMoved) {
        _RedisCommandsQueue_instances.add(this);
        _RedisCommandsQueue_maxLength.set(this, void 0);
        _RedisCommandsQueue_waitingToBeSent.set(this, new LinkedList());
        _RedisCommandsQueue_waitingForReply.set(this, new LinkedList());
        _RedisCommandsQueue_onShardedChannelMoved.set(this, void 0);
        _RedisCommandsQueue_pubSub.set(this, new pub_sub_1.PubSub());
        _RedisCommandsQueue_chainInExecution.set(this, void 0);
        _RedisCommandsQueue_decoder.set(this, new decoder_1.default({
            returnStringsAsBuffers: () => {
                return !!__classPrivateFieldGet(this, _RedisCommandsQueue_waitingForReply, "f").head?.value.returnBuffers ||
                    __classPrivateFieldGet(this, _RedisCommandsQueue_pubSub, "f").isActive;
            },
            onReply: reply => {
                if (__classPrivateFieldGet(this, _RedisCommandsQueue_pubSub, "f").isActive && Array.isArray(reply)) {
                    if (__classPrivateFieldGet(this, _RedisCommandsQueue_pubSub, "f").handleMessageReply(reply))
                        return;
                    const isShardedUnsubscribe = pub_sub_1.PubSub.isShardedUnsubscribe(reply);
                    if (isShardedUnsubscribe && !__classPrivateFieldGet(this, _RedisCommandsQueue_waitingForReply, "f").length) {
                        const channel = reply[1].toString();
                        __classPrivateFieldGet(this, _RedisCommandsQueue_onShardedChannelMoved, "f").call(this, channel, __classPrivateFieldGet(this, _RedisCommandsQueue_pubSub, "f").removeShardedListeners(channel));
                        return;
                    }
                    else if (isShardedUnsubscribe || pub_sub_1.PubSub.isStatusReply(reply)) {
                        const head = __classPrivateFieldGet(this, _RedisCommandsQueue_waitingForReply, "f").head.value;
                        if ((Number.isNaN(head.channelsCounter) && reply[2] === 0) ||
                            --head.channelsCounter === 0) {
                            __classPrivateFieldGet(this, _RedisCommandsQueue_waitingForReply, "f").shift().resolve();
                        }
                        return;
                    }
                    if (PONG.equals(reply[0])) {
                        const { resolve, returnBuffers } = __classPrivateFieldGet(this, _RedisCommandsQueue_waitingForReply, "f").shift(), buffer = (reply[1].length === 0 ? reply[0] : reply[1]);
                        resolve(returnBuffers ? buffer : buffer.toString());
                        return;
                    }
                }
                const { resolve, reject } = __classPrivateFieldGet(this, _RedisCommandsQueue_waitingForReply, "f").shift();
                if (reply instanceof errors_1.ErrorReply) {
                    reject(reply);
                }
                else {
                    resolve(reply);
                }
            }
        }));
        __classPrivateFieldSet(this, _RedisCommandsQueue_maxLength, maxLength, "f");
        __classPrivateFieldSet(this, _RedisCommandsQueue_onShardedChannelMoved, onShardedChannelMoved, "f");
    }
    addCommand(args, options) {
        if (__classPrivateFieldGet(this, _RedisCommandsQueue_maxLength, "f") && __classPrivateFieldGet(this, _RedisCommandsQueue_waitingToBeSent, "f").length + __classPrivateFieldGet(this, _RedisCommandsQueue_waitingForReply, "f").length >= __classPrivateFieldGet(this, _RedisCommandsQueue_maxLength, "f")) {
            return Promise.reject(new Error('The queue is full'));
        }
        else if (options?.signal?.aborted) {
            return Promise.reject(new errors_1.AbortError());
        }
        return new Promise((resolve, reject) => {
            const node = new LinkedList.Node({
                args,
                chainId: options?.chainId,
                returnBuffers: options?.returnBuffers,
                resolve,
                reject
            });
            if (options?.signal) {
                const listener = () => {
                    __classPrivateFieldGet(this, _RedisCommandsQueue_waitingToBeSent, "f").removeNode(node);
                    node.value.reject(new errors_1.AbortError());
                };
                node.value.abort = {
                    signal: options.signal,
                    listener
                };
                // AbortSignal type is incorrent
                options.signal.addEventListener('abort', listener, {
                    once: true
                });
            }
            if (options?.asap) {
                __classPrivateFieldGet(this, _RedisCommandsQueue_waitingToBeSent, "f").unshiftNode(node);
            }
            else {
                __classPrivateFieldGet(this, _RedisCommandsQueue_waitingToBeSent, "f").pushNode(node);
            }
        });
    }
    subscribe(type, channels, listener, returnBuffers) {
        return __classPrivateFieldGet(this, _RedisCommandsQueue_instances, "m", _RedisCommandsQueue_pushPubSubCommand).call(this, __classPrivateFieldGet(this, _RedisCommandsQueue_pubSub, "f").subscribe(type, channels, listener, returnBuffers));
    }
    unsubscribe(type, channels, listener, returnBuffers) {
        return __classPrivateFieldGet(this, _RedisCommandsQueue_instances, "m", _RedisCommandsQueue_pushPubSubCommand).call(this, __classPrivateFieldGet(this, _RedisCommandsQueue_pubSub, "f").unsubscribe(type, channels, listener, returnBuffers));
    }
    resubscribe() {
        const commands = __classPrivateFieldGet(this, _RedisCommandsQueue_pubSub, "f").resubscribe();
        if (!commands.length)
            return;
        return Promise.all(commands.map(command => __classPrivateFieldGet(this, _RedisCommandsQueue_instances, "m", _RedisCommandsQueue_pushPubSubCommand).call(this, command)));
    }
    extendPubSubChannelListeners(type, channel, listeners) {
        return __classPrivateFieldGet(this, _RedisCommandsQueue_instances, "m", _RedisCommandsQueue_pushPubSubCommand).call(this, __classPrivateFieldGet(this, _RedisCommandsQueue_pubSub, "f").extendChannelListeners(type, channel, listeners));
    }
    extendPubSubListeners(type, listeners) {
        return __classPrivateFieldGet(this, _RedisCommandsQueue_instances, "m", _RedisCommandsQueue_pushPubSubCommand).call(this, __classPrivateFieldGet(this, _RedisCommandsQueue_pubSub, "f").extendTypeListeners(type, listeners));
    }
    getPubSubListeners(type) {
        return __classPrivateFieldGet(this, _RedisCommandsQueue_pubSub, "f").getTypeListeners(type);
    }
    getCommandToSend() {
        const toSend = __classPrivateFieldGet(this, _RedisCommandsQueue_waitingToBeSent, "f").shift();
        if (!toSend)
            return;
        let encoded;
        try {
            encoded = (0, encoder_1.default)(toSend.args);
        }
        catch (err) {
            toSend.reject(err);
            return;
        }
        __classPrivateFieldGet(this, _RedisCommandsQueue_waitingForReply, "f").push({
            resolve: toSend.resolve,
            reject: toSend.reject,
            channelsCounter: toSend.channelsCounter,
            returnBuffers: toSend.returnBuffers
        });
        __classPrivateFieldSet(this, _RedisCommandsQueue_chainInExecution, toSend.chainId, "f");
        return encoded;
    }
    onReplyChunk(chunk) {
        __classPrivateFieldGet(this, _RedisCommandsQueue_decoder, "f").write(chunk);
    }
    flushWaitingForReply(err) {
        __classPrivateFieldGet(this, _RedisCommandsQueue_decoder, "f").reset();
        __classPrivateFieldGet(this, _RedisCommandsQueue_pubSub, "f").reset();
        __classPrivateFieldGet(_a, _a, "m", _RedisCommandsQueue_flushQueue).call(_a, __classPrivateFieldGet(this, _RedisCommandsQueue_waitingForReply, "f"), err);
        if (!__classPrivateFieldGet(this, _RedisCommandsQueue_chainInExecution, "f"))
            return;
        while (__classPrivateFieldGet(this, _RedisCommandsQueue_waitingToBeSent, "f").head?.value.chainId === __classPrivateFieldGet(this, _RedisCommandsQueue_chainInExecution, "f")) {
            __classPrivateFieldGet(this, _RedisCommandsQueue_waitingToBeSent, "f").shift();
        }
        __classPrivateFieldSet(this, _RedisCommandsQueue_chainInExecution, undefined, "f");
    }
    flushAll(err) {
        __classPrivateFieldGet(this, _RedisCommandsQueue_decoder, "f").reset();
        __classPrivateFieldGet(this, _RedisCommandsQueue_pubSub, "f").reset();
        __classPrivateFieldGet(_a, _a, "m", _RedisCommandsQueue_flushQueue).call(_a, __classPrivateFieldGet(this, _RedisCommandsQueue_waitingForReply, "f"), err);
        __classPrivateFieldGet(_a, _a, "m", _RedisCommandsQueue_flushQueue).call(_a, __classPrivateFieldGet(this, _RedisCommandsQueue_waitingToBeSent, "f"), err);
    }
}
_a = RedisCommandsQueue, _RedisCommandsQueue_maxLength = new WeakMap(), _RedisCommandsQueue_waitingToBeSent = new WeakMap(), _RedisCommandsQueue_waitingForReply = new WeakMap(), _RedisCommandsQueue_onShardedChannelMoved = new WeakMap(), _RedisCommandsQueue_pubSub = new WeakMap(), _RedisCommandsQueue_chainInExecution = new WeakMap(), _RedisCommandsQueue_decoder = new WeakMap(), _RedisCommandsQueue_instances = new WeakSet(), _RedisCommandsQueue_flushQueue = function _RedisCommandsQueue_flushQueue(queue, err) {
    while (queue.length) {
        queue.shift().reject(err);
    }
}, _RedisCommandsQueue_pushPubSubCommand = function _RedisCommandsQueue_pushPubSubCommand(command) {
    if (command === undefined)
        return;
    return new Promise((resolve, reject) => {
        __classPrivateFieldGet(this, _RedisCommandsQueue_waitingToBeSent, "f").push({
            args: command.args,
            channelsCounter: command.channelsCounter,
            returnBuffers: true,
            resolve: () => {
                command.resolve();
                resolve();
            },
            reject: err => {
                command.reject?.();
                reject(err);
            }
        });
    });
};
exports.default = RedisCommandsQueue;
