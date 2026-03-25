"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("./commander");
const errors_1 = require("./errors");
class RedisMultiCommand {
    constructor() {
        Object.defineProperty(this, "queue", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "scriptsInUse", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Set()
        });
    }
    static generateChainId() {
        return Symbol('RedisMultiCommand Chain Id');
    }
    addCommand(args, transformReply) {
        this.queue.push({
            args,
            transformReply
        });
    }
    addFunction(name, fn, args) {
        const transformedArguments = (0, commander_1.fCallArguments)(name, fn, fn.transformArguments(...args));
        this.queue.push({
            args: transformedArguments,
            transformReply: fn.transformReply
        });
        return transformedArguments;
    }
    addScript(script, args) {
        const transformedArguments = [];
        if (this.scriptsInUse.has(script.SHA1)) {
            transformedArguments.push('EVALSHA', script.SHA1);
        }
        else {
            this.scriptsInUse.add(script.SHA1);
            transformedArguments.push('EVAL', script.SCRIPT);
        }
        if (script.NUMBER_OF_KEYS !== undefined) {
            transformedArguments.push(script.NUMBER_OF_KEYS.toString());
        }
        const scriptArguments = script.transformArguments(...args);
        transformedArguments.push(...scriptArguments);
        if (scriptArguments.preserve) {
            transformedArguments.preserve = scriptArguments.preserve;
        }
        this.addCommand(transformedArguments, script.transformReply);
        return transformedArguments;
    }
    handleExecReplies(rawReplies) {
        const execReply = rawReplies[rawReplies.length - 1];
        if (execReply === null) {
            throw new errors_1.WatchError();
        }
        return this.transformReplies(execReply);
    }
    transformReplies(rawReplies) {
        const errorIndexes = [], replies = rawReplies.map((reply, i) => {
            if (reply instanceof errors_1.ErrorReply) {
                errorIndexes.push(i);
                return reply;
            }
            const { transformReply, args } = this.queue[i];
            return transformReply ? transformReply(reply, args.preserve) : reply;
        });
        if (errorIndexes.length)
            throw new errors_1.MultiErrorReply(replies, errorIndexes);
        return replies;
    }
}
exports.default = RedisMultiCommand;
