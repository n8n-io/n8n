"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _RedisClusterMultiCommand_multi, _RedisClusterMultiCommand_executor, _RedisClusterMultiCommand_firstKey;
Object.defineProperty(exports, "__esModule", { value: true });
const commands_1 = require("./commands");
const multi_command_1 = require("../multi-command");
const commander_1 = require("../commander");
const _1 = require(".");
class RedisClusterMultiCommand {
    static extend(extensions) {
        return (0, commander_1.attachExtensions)({
            BaseClass: RedisClusterMultiCommand,
            modulesExecutor: RedisClusterMultiCommand.prototype.commandsExecutor,
            modules: extensions?.modules,
            functionsExecutor: RedisClusterMultiCommand.prototype.functionsExecutor,
            functions: extensions?.functions,
            scriptsExecutor: RedisClusterMultiCommand.prototype.scriptsExecutor,
            scripts: extensions?.scripts
        });
    }
    constructor(executor, firstKey) {
        _RedisClusterMultiCommand_multi.set(this, new multi_command_1.default());
        _RedisClusterMultiCommand_executor.set(this, void 0);
        _RedisClusterMultiCommand_firstKey.set(this, void 0);
        Object.defineProperty(this, "EXEC", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: this.exec
        });
        __classPrivateFieldSet(this, _RedisClusterMultiCommand_executor, executor, "f");
        __classPrivateFieldSet(this, _RedisClusterMultiCommand_firstKey, firstKey, "f");
    }
    commandsExecutor(command, args) {
        const transformedArguments = command.transformArguments(...args);
        __classPrivateFieldSet(this, _RedisClusterMultiCommand_firstKey, __classPrivateFieldGet(this, _RedisClusterMultiCommand_firstKey, "f") ?? _1.default.extractFirstKey(command, args, transformedArguments), "f");
        return this.addCommand(undefined, transformedArguments, command.transformReply);
    }
    addCommand(firstKey, args, transformReply) {
        __classPrivateFieldSet(this, _RedisClusterMultiCommand_firstKey, __classPrivateFieldGet(this, _RedisClusterMultiCommand_firstKey, "f") ?? firstKey, "f");
        __classPrivateFieldGet(this, _RedisClusterMultiCommand_multi, "f").addCommand(args, transformReply);
        return this;
    }
    functionsExecutor(fn, args, name) {
        const transformedArguments = __classPrivateFieldGet(this, _RedisClusterMultiCommand_multi, "f").addFunction(name, fn, args);
        __classPrivateFieldSet(this, _RedisClusterMultiCommand_firstKey, __classPrivateFieldGet(this, _RedisClusterMultiCommand_firstKey, "f") ?? _1.default.extractFirstKey(fn, args, transformedArguments), "f");
        return this;
    }
    scriptsExecutor(script, args) {
        const transformedArguments = __classPrivateFieldGet(this, _RedisClusterMultiCommand_multi, "f").addScript(script, args);
        __classPrivateFieldSet(this, _RedisClusterMultiCommand_firstKey, __classPrivateFieldGet(this, _RedisClusterMultiCommand_firstKey, "f") ?? _1.default.extractFirstKey(script, args, transformedArguments), "f");
        return this;
    }
    async exec(execAsPipeline = false) {
        if (execAsPipeline) {
            return this.execAsPipeline();
        }
        return __classPrivateFieldGet(this, _RedisClusterMultiCommand_multi, "f").handleExecReplies(await __classPrivateFieldGet(this, _RedisClusterMultiCommand_executor, "f").call(this, __classPrivateFieldGet(this, _RedisClusterMultiCommand_multi, "f").queue, __classPrivateFieldGet(this, _RedisClusterMultiCommand_firstKey, "f"), multi_command_1.default.generateChainId()));
    }
    async execAsPipeline() {
        return __classPrivateFieldGet(this, _RedisClusterMultiCommand_multi, "f").transformReplies(await __classPrivateFieldGet(this, _RedisClusterMultiCommand_executor, "f").call(this, __classPrivateFieldGet(this, _RedisClusterMultiCommand_multi, "f").queue, __classPrivateFieldGet(this, _RedisClusterMultiCommand_firstKey, "f")));
    }
}
_RedisClusterMultiCommand_multi = new WeakMap(), _RedisClusterMultiCommand_executor = new WeakMap(), _RedisClusterMultiCommand_firstKey = new WeakMap();
exports.default = RedisClusterMultiCommand;
(0, commander_1.attachCommands)({
    BaseClass: RedisClusterMultiCommand,
    commands: commands_1.default,
    executor: RedisClusterMultiCommand.prototype.commandsExecutor
});
