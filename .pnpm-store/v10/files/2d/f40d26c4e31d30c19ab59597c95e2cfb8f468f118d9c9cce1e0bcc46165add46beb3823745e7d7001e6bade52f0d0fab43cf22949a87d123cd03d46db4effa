"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const errors_1 = require("../../errors");
const buffer_1 = require("./composers/buffer");
const string_1 = require("./composers/string");
// RESP2 specification
// https://redis.io/topics/protocol
var Types;
(function (Types) {
    Types[Types["SIMPLE_STRING"] = 43] = "SIMPLE_STRING";
    Types[Types["ERROR"] = 45] = "ERROR";
    Types[Types["INTEGER"] = 58] = "INTEGER";
    Types[Types["BULK_STRING"] = 36] = "BULK_STRING";
    Types[Types["ARRAY"] = 42] = "ARRAY"; // *
})(Types || (Types = {}));
var ASCII;
(function (ASCII) {
    ASCII[ASCII["CR"] = 13] = "CR";
    ASCII[ASCII["ZERO"] = 48] = "ZERO";
    ASCII[ASCII["MINUS"] = 45] = "MINUS";
})(ASCII || (ASCII = {}));
// Using TypeScript `private` and not the build-in `#` to avoid __classPrivateFieldGet and __classPrivateFieldSet
class RESP2Decoder {
    constructor(options) {
        Object.defineProperty(this, "options", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: options
        });
        Object.defineProperty(this, "cursor", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "type", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "bufferComposer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new buffer_1.default()
        });
        Object.defineProperty(this, "stringComposer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new string_1.default()
        });
        Object.defineProperty(this, "currentStringComposer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: this.stringComposer
        });
        Object.defineProperty(this, "integer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "isNegativeInteger", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "bulkStringRemainingLength", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "arraysInProcess", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "initializeArray", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "arrayItemType", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
    reset() {
        this.cursor = 0;
        this.type = undefined;
        this.bufferComposer.reset();
        this.stringComposer.reset();
        this.currentStringComposer = this.stringComposer;
    }
    write(chunk) {
        while (this.cursor < chunk.length) {
            if (!this.type) {
                this.currentStringComposer = this.options.returnStringsAsBuffers() ?
                    this.bufferComposer :
                    this.stringComposer;
                this.type = chunk[this.cursor];
                if (++this.cursor >= chunk.length)
                    break;
            }
            const reply = this.parseType(chunk, this.type);
            if (reply === undefined)
                break;
            this.type = undefined;
            this.options.onReply(reply);
        }
        this.cursor -= chunk.length;
    }
    parseType(chunk, type, arraysToKeep) {
        switch (type) {
            case Types.SIMPLE_STRING:
                return this.parseSimpleString(chunk);
            case Types.ERROR:
                return this.parseError(chunk);
            case Types.INTEGER:
                return this.parseInteger(chunk);
            case Types.BULK_STRING:
                return this.parseBulkString(chunk);
            case Types.ARRAY:
                return this.parseArray(chunk, arraysToKeep);
        }
    }
    compose(chunk, composer) {
        for (let i = this.cursor; i < chunk.length; i++) {
            if (chunk[i] === ASCII.CR) {
                const reply = composer.end(chunk.subarray(this.cursor, i));
                this.cursor = i + 2;
                return reply;
            }
        }
        const toWrite = chunk.subarray(this.cursor);
        composer.write(toWrite);
        this.cursor = chunk.length;
    }
    parseSimpleString(chunk) {
        return this.compose(chunk, this.currentStringComposer);
    }
    parseError(chunk) {
        const message = this.compose(chunk, this.stringComposer);
        if (message !== undefined) {
            return new errors_1.ErrorReply(message);
        }
    }
    parseInteger(chunk) {
        if (this.isNegativeInteger === undefined) {
            this.isNegativeInteger = chunk[this.cursor] === ASCII.MINUS;
            if (this.isNegativeInteger && ++this.cursor === chunk.length)
                return;
        }
        do {
            const byte = chunk[this.cursor];
            if (byte === ASCII.CR) {
                const integer = this.isNegativeInteger ? -this.integer : this.integer;
                this.integer = 0;
                this.isNegativeInteger = undefined;
                this.cursor += 2;
                return integer;
            }
            this.integer = this.integer * 10 + byte - ASCII.ZERO;
        } while (++this.cursor < chunk.length);
    }
    parseBulkString(chunk) {
        if (this.bulkStringRemainingLength === undefined) {
            const length = this.parseInteger(chunk);
            if (length === undefined)
                return;
            if (length === -1)
                return null;
            this.bulkStringRemainingLength = length;
            if (this.cursor >= chunk.length)
                return;
        }
        const end = this.cursor + this.bulkStringRemainingLength;
        if (chunk.length >= end) {
            const reply = this.currentStringComposer.end(chunk.subarray(this.cursor, end));
            this.bulkStringRemainingLength = undefined;
            this.cursor = end + 2;
            return reply;
        }
        const toWrite = chunk.subarray(this.cursor);
        this.currentStringComposer.write(toWrite);
        this.bulkStringRemainingLength -= toWrite.length;
        this.cursor = chunk.length;
    }
    parseArray(chunk, arraysToKeep = 0) {
        if (this.initializeArray || this.arraysInProcess.length === arraysToKeep) {
            const length = this.parseInteger(chunk);
            if (length === undefined) {
                this.initializeArray = true;
                return undefined;
            }
            this.initializeArray = false;
            this.arrayItemType = undefined;
            if (length === -1) {
                return this.returnArrayReply(null, arraysToKeep, chunk);
            }
            else if (length === 0) {
                return this.returnArrayReply([], arraysToKeep, chunk);
            }
            this.arraysInProcess.push({
                array: new Array(length),
                pushCounter: 0
            });
        }
        while (this.cursor < chunk.length) {
            if (!this.arrayItemType) {
                this.arrayItemType = chunk[this.cursor];
                if (++this.cursor >= chunk.length)
                    break;
            }
            const item = this.parseType(chunk, this.arrayItemType, arraysToKeep + 1);
            if (item === undefined)
                break;
            this.arrayItemType = undefined;
            const reply = this.pushArrayItem(item, arraysToKeep);
            if (reply !== undefined)
                return reply;
        }
    }
    returnArrayReply(reply, arraysToKeep, chunk) {
        if (this.arraysInProcess.length <= arraysToKeep)
            return reply;
        return this.pushArrayItem(reply, arraysToKeep, chunk);
    }
    pushArrayItem(item, arraysToKeep, chunk) {
        const to = this.arraysInProcess[this.arraysInProcess.length - 1];
        to.array[to.pushCounter] = item;
        if (++to.pushCounter === to.array.length) {
            return this.returnArrayReply(this.arraysInProcess.pop().array, arraysToKeep, chunk);
        }
        else if (chunk && chunk.length > this.cursor) {
            return this.parseArray(chunk, arraysToKeep);
        }
    }
}
exports.default = RESP2Decoder;
