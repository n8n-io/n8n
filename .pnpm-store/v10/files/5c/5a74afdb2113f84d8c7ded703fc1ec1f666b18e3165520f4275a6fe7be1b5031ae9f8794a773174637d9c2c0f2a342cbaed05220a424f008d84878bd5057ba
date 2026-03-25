"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Command_1 = require("./Command");
const utils_1 = require("./utils");
const RedisParser = require("redis-parser");
const SubscriptionSet_1 = require("./SubscriptionSet");
const debug = (0, utils_1.Debug)("dataHandler");
class DataHandler {
    constructor(redis, parserOptions) {
        this.redis = redis;
        const parser = new RedisParser({
            stringNumbers: parserOptions.stringNumbers,
            returnBuffers: true,
            returnError: (err) => {
                this.returnError(err);
            },
            returnFatalError: (err) => {
                this.returnFatalError(err);
            },
            returnReply: (reply) => {
                this.returnReply(reply);
            },
        });
        redis.stream.on("data", (data) => {
            parser.execute(data);
        });
    }
    returnFatalError(err) {
        err.message += ". Please report this.";
        this.redis.recoverFromFatalError(err, err, { offlineQueue: false });
    }
    returnError(err) {
        const item = this.shiftCommand(err);
        if (!item) {
            return;
        }
        err.command = {
            name: item.command.name,
            args: item.command.args,
        };
        this.redis.handleReconnection(err, item);
    }
    returnReply(reply) {
        if (this.handleMonitorReply(reply)) {
            return;
        }
        if (this.handleSubscriberReply(reply)) {
            return;
        }
        const item = this.shiftCommand(reply);
        if (!item) {
            return;
        }
        if (Command_1.default.checkFlag("ENTER_SUBSCRIBER_MODE", item.command.name)) {
            this.redis.condition.subscriber = new SubscriptionSet_1.default();
            this.redis.condition.subscriber.add(item.command.name, reply[1].toString());
            if (!fillSubCommand(item.command, reply[2])) {
                this.redis.commandQueue.unshift(item);
            }
        }
        else if (Command_1.default.checkFlag("EXIT_SUBSCRIBER_MODE", item.command.name)) {
            if (!fillUnsubCommand(item.command, reply[2])) {
                this.redis.commandQueue.unshift(item);
            }
        }
        else {
            item.command.resolve(reply);
        }
    }
    handleSubscriberReply(reply) {
        if (!this.redis.condition.subscriber) {
            return false;
        }
        const replyType = Array.isArray(reply) ? reply[0].toString() : null;
        debug('receive reply "%s" in subscriber mode', replyType);
        switch (replyType) {
            case "message":
                if (this.redis.listeners("message").length > 0) {
                    // Check if there're listeners to avoid unnecessary `toString()`.
                    this.redis.emit("message", reply[1].toString(), reply[2] ? reply[2].toString() : "");
                }
                this.redis.emit("messageBuffer", reply[1], reply[2]);
                break;
            case "pmessage": {
                const pattern = reply[1].toString();
                if (this.redis.listeners("pmessage").length > 0) {
                    this.redis.emit("pmessage", pattern, reply[2].toString(), reply[3].toString());
                }
                this.redis.emit("pmessageBuffer", pattern, reply[2], reply[3]);
                break;
            }
            case "smessage": {
                if (this.redis.listeners("smessage").length > 0) {
                    this.redis.emit("smessage", reply[1].toString(), reply[2] ? reply[2].toString() : "");
                }
                this.redis.emit("smessageBuffer", reply[1], reply[2]);
                break;
            }
            case "ssubscribe":
            case "subscribe":
            case "psubscribe": {
                const channel = reply[1].toString();
                this.redis.condition.subscriber.add(replyType, channel);
                const item = this.shiftCommand(reply);
                if (!item) {
                    return;
                }
                if (!fillSubCommand(item.command, reply[2])) {
                    this.redis.commandQueue.unshift(item);
                }
                break;
            }
            case "sunsubscribe":
            case "unsubscribe":
            case "punsubscribe": {
                const channel = reply[1] ? reply[1].toString() : null;
                if (channel) {
                    this.redis.condition.subscriber.del(replyType, channel);
                }
                const count = reply[2];
                if (Number(count) === 0) {
                    this.redis.condition.subscriber = false;
                }
                const item = this.shiftCommand(reply);
                if (!item) {
                    return;
                }
                if (!fillUnsubCommand(item.command, count)) {
                    this.redis.commandQueue.unshift(item);
                }
                break;
            }
            default: {
                const item = this.shiftCommand(reply);
                if (!item) {
                    return;
                }
                item.command.resolve(reply);
            }
        }
        return true;
    }
    handleMonitorReply(reply) {
        if (this.redis.status !== "monitoring") {
            return false;
        }
        const replyStr = reply.toString();
        if (replyStr === "OK") {
            // Valid commands in the monitoring mode are AUTH and MONITOR,
            // both of which always reply with 'OK'.
            // So if we got an 'OK', we can make certain that
            // the reply is made to AUTH & MONITOR.
            return false;
        }
        // Since commands sent in the monitoring mode will trigger an exception,
        // any replies we received in the monitoring mode should consider to be
        // realtime monitor data instead of result of commands.
        const len = replyStr.indexOf(" ");
        const timestamp = replyStr.slice(0, len);
        const argIndex = replyStr.indexOf('"');
        const args = replyStr
            .slice(argIndex + 1, -1)
            .split('" "')
            .map((elem) => elem.replace(/\\"/g, '"'));
        const dbAndSource = replyStr.slice(len + 2, argIndex - 2).split(" ");
        this.redis.emit("monitor", timestamp, args, dbAndSource[1], dbAndSource[0]);
        return true;
    }
    shiftCommand(reply) {
        const item = this.redis.commandQueue.shift();
        if (!item) {
            const message = "Command queue state error. If you can reproduce this, please report it.";
            const error = new Error(message +
                (reply instanceof Error
                    ? ` Last error: ${reply.message}`
                    : ` Last reply: ${reply.toString()}`));
            this.redis.emit("error", error);
            return null;
        }
        return item;
    }
}
exports.default = DataHandler;
const remainingRepliesMap = new WeakMap();
function fillSubCommand(command, count) {
    let remainingReplies = remainingRepliesMap.has(command)
        ? remainingRepliesMap.get(command)
        : command.args.length;
    remainingReplies -= 1;
    if (remainingReplies <= 0) {
        command.resolve(count);
        remainingRepliesMap.delete(command);
        return true;
    }
    remainingRepliesMap.set(command, remainingReplies);
    return false;
}
function fillUnsubCommand(command, count) {
    let remainingReplies = remainingRepliesMap.has(command)
        ? remainingRepliesMap.get(command)
        : command.args.length;
    if (remainingReplies === 0) {
        if (Number(count) === 0) {
            remainingRepliesMap.delete(command);
            command.resolve(count);
            return true;
        }
        return false;
    }
    remainingReplies -= 1;
    if (remainingReplies <= 0) {
        command.resolve(count);
        return true;
    }
    remainingRepliesMap.set(command, remainingReplies);
    return false;
}
