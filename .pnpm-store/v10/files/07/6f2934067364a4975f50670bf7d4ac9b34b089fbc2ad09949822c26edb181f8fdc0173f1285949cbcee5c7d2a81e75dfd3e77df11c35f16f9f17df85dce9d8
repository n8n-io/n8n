"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commands_1 = require("@ioredis/commands");
const calculateSlot = require("cluster-key-slot");
const standard_as_callback_1 = require("standard-as-callback");
const utils_1 = require("./utils");
/**
 * Command instance
 *
 * It's rare that you need to create a Command instance yourself.
 *
 * ```js
 * var infoCommand = new Command('info', null, function (err, result) {
 *   console.log('result', result);
 * });
 *
 * redis.sendCommand(infoCommand);
 *
 * // When no callback provided, Command instance will have a `promise` property,
 * // which will resolve/reject with the result of the command.
 * var getCommand = new Command('get', ['foo']);
 * getCommand.promise.then(function (result) {
 *   console.log('result', result);
 * });
 * ```
 */
class Command {
    /**
     * Creates an instance of Command.
     * @param name Command name
     * @param args An array of command arguments
     * @param options
     * @param callback The callback that handles the response.
     * If omit, the response will be handled via Promise
     */
    constructor(name, args = [], options = {}, callback) {
        this.name = name;
        this.inTransaction = false;
        this.isResolved = false;
        this.transformed = false;
        this.replyEncoding = options.replyEncoding;
        this.errorStack = options.errorStack;
        this.args = args.flat();
        this.callback = callback;
        this.initPromise();
        if (options.keyPrefix) {
            // @ts-expect-error
            const isBufferKeyPrefix = options.keyPrefix instanceof Buffer;
            // @ts-expect-error
            let keyPrefixBuffer = isBufferKeyPrefix
                ? options.keyPrefix
                : null;
            this._iterateKeys((key) => {
                if (key instanceof Buffer) {
                    if (keyPrefixBuffer === null) {
                        keyPrefixBuffer = Buffer.from(options.keyPrefix);
                    }
                    return Buffer.concat([keyPrefixBuffer, key]);
                }
                else if (isBufferKeyPrefix) {
                    // @ts-expect-error
                    return Buffer.concat([options.keyPrefix, Buffer.from(String(key))]);
                }
                return options.keyPrefix + key;
            });
        }
        if (options.readOnly) {
            this.isReadOnly = true;
        }
    }
    /**
     * Check whether the command has the flag
     */
    static checkFlag(flagName, commandName) {
        return !!this.getFlagMap()[flagName][commandName];
    }
    static setArgumentTransformer(name, func) {
        this._transformer.argument[name] = func;
    }
    static setReplyTransformer(name, func) {
        this._transformer.reply[name] = func;
    }
    static getFlagMap() {
        if (!this.flagMap) {
            this.flagMap = Object.keys(Command.FLAGS).reduce((map, flagName) => {
                map[flagName] = {};
                Command.FLAGS[flagName].forEach((commandName) => {
                    map[flagName][commandName] = true;
                });
                return map;
            }, {});
        }
        return this.flagMap;
    }
    getSlot() {
        if (typeof this.slot === "undefined") {
            const key = this.getKeys()[0];
            this.slot = key == null ? null : calculateSlot(key);
        }
        return this.slot;
    }
    getKeys() {
        return this._iterateKeys();
    }
    /**
     * Convert command to writable buffer or string
     */
    toWritable(_socket) {
        let result;
        const commandStr = "*" +
            (this.args.length + 1) +
            "\r\n$" +
            Buffer.byteLength(this.name) +
            "\r\n" +
            this.name +
            "\r\n";
        if (this.bufferMode) {
            const buffers = new MixedBuffers();
            buffers.push(commandStr);
            for (let i = 0; i < this.args.length; ++i) {
                const arg = this.args[i];
                if (arg instanceof Buffer) {
                    if (arg.length === 0) {
                        buffers.push("$0\r\n\r\n");
                    }
                    else {
                        buffers.push("$" + arg.length + "\r\n");
                        buffers.push(arg);
                        buffers.push("\r\n");
                    }
                }
                else {
                    buffers.push("$" +
                        Buffer.byteLength(arg) +
                        "\r\n" +
                        arg +
                        "\r\n");
                }
            }
            result = buffers.toBuffer();
        }
        else {
            result = commandStr;
            for (let i = 0; i < this.args.length; ++i) {
                const arg = this.args[i];
                result +=
                    "$" +
                        Buffer.byteLength(arg) +
                        "\r\n" +
                        arg +
                        "\r\n";
            }
        }
        return result;
    }
    stringifyArguments() {
        for (let i = 0; i < this.args.length; ++i) {
            const arg = this.args[i];
            if (typeof arg === "string") {
                // buffers and strings don't need any transformation
            }
            else if (arg instanceof Buffer) {
                this.bufferMode = true;
            }
            else {
                this.args[i] = (0, utils_1.toArg)(arg);
            }
        }
    }
    /**
     * Convert buffer/buffer[] to string/string[],
     * and apply reply transformer.
     */
    transformReply(result) {
        if (this.replyEncoding) {
            result = (0, utils_1.convertBufferToString)(result, this.replyEncoding);
        }
        const transformer = Command._transformer.reply[this.name];
        if (transformer) {
            result = transformer(result);
        }
        return result;
    }
    /**
     * Set the wait time before terminating the attempt to execute a command
     * and generating an error.
     */
    setTimeout(ms) {
        if (!this._commandTimeoutTimer) {
            this._commandTimeoutTimer = setTimeout(() => {
                if (!this.isResolved) {
                    this.reject(new Error("Command timed out"));
                }
            }, ms);
        }
    }
    initPromise() {
        const promise = new Promise((resolve, reject) => {
            if (!this.transformed) {
                this.transformed = true;
                const transformer = Command._transformer.argument[this.name];
                if (transformer) {
                    this.args = transformer(this.args);
                }
                this.stringifyArguments();
            }
            this.resolve = this._convertValue(resolve);
            if (this.errorStack) {
                this.reject = (err) => {
                    reject((0, utils_1.optimizeErrorStack)(err, this.errorStack.stack, __dirname));
                };
            }
            else {
                this.reject = reject;
            }
        });
        this.promise = (0, standard_as_callback_1.default)(promise, this.callback);
    }
    /**
     * Iterate through the command arguments that are considered keys.
     */
    _iterateKeys(transform = (key) => key) {
        if (typeof this.keys === "undefined") {
            this.keys = [];
            if ((0, commands_1.exists)(this.name)) {
                // @ts-expect-error
                const keyIndexes = (0, commands_1.getKeyIndexes)(this.name, this.args);
                for (const index of keyIndexes) {
                    this.args[index] = transform(this.args[index]);
                    this.keys.push(this.args[index]);
                }
            }
        }
        return this.keys;
    }
    /**
     * Convert the value from buffer to the target encoding.
     */
    _convertValue(resolve) {
        return (value) => {
            try {
                const existingTimer = this._commandTimeoutTimer;
                if (existingTimer) {
                    clearTimeout(existingTimer);
                    delete this._commandTimeoutTimer;
                }
                resolve(this.transformReply(value));
                this.isResolved = true;
            }
            catch (err) {
                this.reject(err);
            }
            return this.promise;
        };
    }
}
exports.default = Command;
Command.FLAGS = {
    VALID_IN_SUBSCRIBER_MODE: [
        "subscribe",
        "psubscribe",
        "unsubscribe",
        "punsubscribe",
        "ssubscribe",
        "sunsubscribe",
        "ping",
        "quit",
    ],
    VALID_IN_MONITOR_MODE: ["monitor", "auth"],
    ENTER_SUBSCRIBER_MODE: ["subscribe", "psubscribe", "ssubscribe"],
    EXIT_SUBSCRIBER_MODE: ["unsubscribe", "punsubscribe", "sunsubscribe"],
    WILL_DISCONNECT: ["quit"],
};
Command._transformer = {
    argument: {},
    reply: {},
};
const msetArgumentTransformer = function (args) {
    if (args.length === 1) {
        if (args[0] instanceof Map) {
            return (0, utils_1.convertMapToArray)(args[0]);
        }
        if (typeof args[0] === "object" && args[0] !== null) {
            return (0, utils_1.convertObjectToArray)(args[0]);
        }
    }
    return args;
};
const hsetArgumentTransformer = function (args) {
    if (args.length === 2) {
        if (args[1] instanceof Map) {
            return [args[0]].concat((0, utils_1.convertMapToArray)(args[1]));
        }
        if (typeof args[1] === "object" && args[1] !== null) {
            return [args[0]].concat((0, utils_1.convertObjectToArray)(args[1]));
        }
    }
    return args;
};
Command.setArgumentTransformer("mset", msetArgumentTransformer);
Command.setArgumentTransformer("msetnx", msetArgumentTransformer);
Command.setArgumentTransformer("hset", hsetArgumentTransformer);
Command.setArgumentTransformer("hmset", hsetArgumentTransformer);
Command.setReplyTransformer("hgetall", function (result) {
    if (Array.isArray(result)) {
        const obj = {};
        for (let i = 0; i < result.length; i += 2) {
            const key = result[i];
            const value = result[i + 1];
            if (key in obj) {
                // can only be truthy if the property is special somehow, like '__proto__' or 'constructor'
                // https://github.com/luin/ioredis/issues/1267
                Object.defineProperty(obj, key, {
                    value,
                    configurable: true,
                    enumerable: true,
                    writable: true,
                });
            }
            else {
                obj[key] = value;
            }
        }
        return obj;
    }
    return result;
});
class MixedBuffers {
    constructor() {
        this.length = 0;
        this.items = [];
    }
    push(x) {
        this.length += Buffer.byteLength(x);
        this.items.push(x);
    }
    toBuffer() {
        const result = Buffer.allocUnsafe(this.length);
        let offset = 0;
        for (const item of this.items) {
            const length = Buffer.byteLength(item);
            Buffer.isBuffer(item)
                ? item.copy(result, offset)
                : result.write(item, offset, length);
            offset += length;
        }
        return result;
    }
}
