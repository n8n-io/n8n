"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commands_1 = require("@ioredis/commands");
const autoPipelining_1 = require("../autoPipelining");
const Command_1 = require("../Command");
const Script_1 = require("../Script");
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class Commander {
    constructor() {
        this.options = {};
        /**
         * @ignore
         */
        this.scriptsSet = {};
        /**
         * @ignore
         */
        this.addedBuiltinSet = new Set();
    }
    /**
     * Return supported builtin commands
     */
    getBuiltinCommands() {
        return commands.slice(0);
    }
    /**
     * Create a builtin command
     */
    createBuiltinCommand(commandName) {
        return {
            string: generateFunction(null, commandName, "utf8"),
            buffer: generateFunction(null, commandName, null),
        };
    }
    /**
     * Create add builtin command
     */
    addBuiltinCommand(commandName) {
        this.addedBuiltinSet.add(commandName);
        this[commandName] = generateFunction(commandName, commandName, "utf8");
        this[commandName + "Buffer"] = generateFunction(commandName + "Buffer", commandName, null);
    }
    /**
     * Define a custom command using lua script
     */
    defineCommand(name, definition) {
        const script = new Script_1.default(definition.lua, definition.numberOfKeys, this.options.keyPrefix, definition.readOnly);
        this.scriptsSet[name] = script;
        this[name] = generateScriptingFunction(name, name, script, "utf8");
        this[name + "Buffer"] = generateScriptingFunction(name + "Buffer", name, script, null);
    }
    /**
     * @ignore
     */
    sendCommand(command, stream, node) {
        throw new Error('"sendCommand" is not implemented');
    }
}
const commands = commands_1.list.filter((command) => command !== "monitor");
commands.push("sentinel");
commands.forEach(function (commandName) {
    Commander.prototype[commandName] = generateFunction(commandName, commandName, "utf8");
    Commander.prototype[commandName + "Buffer"] = generateFunction(commandName + "Buffer", commandName, null);
});
Commander.prototype.call = generateFunction("call", "utf8");
Commander.prototype.callBuffer = generateFunction("callBuffer", null);
// @ts-expect-error
Commander.prototype.send_command = Commander.prototype.call;
function generateFunction(functionName, _commandName, _encoding) {
    if (typeof _encoding === "undefined") {
        _encoding = _commandName;
        _commandName = null;
    }
    return function (...args) {
        const commandName = (_commandName || args.shift());
        let callback = args[args.length - 1];
        if (typeof callback === "function") {
            args.pop();
        }
        else {
            callback = undefined;
        }
        const options = {
            errorStack: this.options.showFriendlyErrorStack ? new Error() : undefined,
            keyPrefix: this.options.keyPrefix,
            replyEncoding: _encoding,
        };
        // No auto pipeline, use regular command sending
        if (!(0, autoPipelining_1.shouldUseAutoPipelining)(this, functionName, commandName)) {
            return this.sendCommand(
            // @ts-expect-error
            new Command_1.default(commandName, args, options, callback));
        }
        // Create a new pipeline and make sure it's scheduled
        return (0, autoPipelining_1.executeWithAutoPipelining)(this, functionName, commandName, 
        // @ts-expect-error
        args, callback);
    };
}
function generateScriptingFunction(functionName, commandName, script, encoding) {
    return function (...args) {
        const callback = typeof args[args.length - 1] === "function" ? args.pop() : undefined;
        const options = {
            replyEncoding: encoding,
        };
        if (this.options.showFriendlyErrorStack) {
            options.errorStack = new Error();
        }
        // No auto pipeline, use regular command sending
        if (!(0, autoPipelining_1.shouldUseAutoPipelining)(this, functionName, commandName)) {
            return script.execute(this, args, options, callback);
        }
        // Create a new pipeline and make sure it's scheduled
        return (0, autoPipelining_1.executeWithAutoPipelining)(this, functionName, commandName, args, callback);
    };
}
exports.default = Commander;
