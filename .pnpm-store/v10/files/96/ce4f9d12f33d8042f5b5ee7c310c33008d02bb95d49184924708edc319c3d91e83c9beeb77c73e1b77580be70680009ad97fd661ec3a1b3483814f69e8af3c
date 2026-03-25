"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fCallArguments = exports.transformCommandReply = exports.transformLegacyCommandArguments = exports.transformCommandArguments = exports.attachExtensions = exports.attachCommands = void 0;
const command_options_1 = require("./command-options");
function attachCommands({ BaseClass, commands, executor }) {
    for (const [name, command] of Object.entries(commands)) {
        BaseClass.prototype[name] = function (...args) {
            return executor.call(this, command, args, name);
        };
    }
}
exports.attachCommands = attachCommands;
function attachExtensions(config) {
    let Commander;
    if (config.modules) {
        Commander = attachWithNamespaces({
            BaseClass: config.BaseClass,
            namespaces: config.modules,
            executor: config.modulesExecutor
        });
    }
    if (config.functions) {
        Commander = attachWithNamespaces({
            BaseClass: Commander ?? config.BaseClass,
            namespaces: config.functions,
            executor: config.functionsExecutor
        });
    }
    if (config.scripts) {
        Commander ?? (Commander = class extends config.BaseClass {
        });
        attachCommands({
            BaseClass: Commander,
            commands: config.scripts,
            executor: config.scriptsExecutor
        });
    }
    return Commander ?? config.BaseClass;
}
exports.attachExtensions = attachExtensions;
function attachWithNamespaces({ BaseClass, namespaces, executor }) {
    const Commander = class extends BaseClass {
        constructor(...args) {
            super(...args);
            for (const namespace of Object.keys(namespaces)) {
                this[namespace] = Object.create(this[namespace], {
                    self: {
                        value: this
                    }
                });
            }
        }
    };
    for (const [namespace, commands] of Object.entries(namespaces)) {
        Commander.prototype[namespace] = {};
        for (const [name, command] of Object.entries(commands)) {
            Commander.prototype[namespace][name] = function (...args) {
                return executor.call(this.self, command, args, name);
            };
        }
    }
    return Commander;
}
function transformCommandArguments(command, args) {
    let options;
    if ((0, command_options_1.isCommandOptions)(args[0])) {
        options = args[0];
        args = args.slice(1);
    }
    return {
        jsArgs: args,
        args: command.transformArguments(...args),
        options
    };
}
exports.transformCommandArguments = transformCommandArguments;
function transformLegacyCommandArguments(args) {
    return args.flat().map(arg => {
        return typeof arg === 'number' || arg instanceof Date ?
            arg.toString() :
            arg;
    });
}
exports.transformLegacyCommandArguments = transformLegacyCommandArguments;
function transformCommandReply(command, rawReply, preserved) {
    if (!command.transformReply) {
        return rawReply;
    }
    return command.transformReply(rawReply, preserved);
}
exports.transformCommandReply = transformCommandReply;
function fCallArguments(name, fn, args) {
    const actualArgs = [
        fn.IS_READ_ONLY ? 'FCALL_RO' : 'FCALL',
        name
    ];
    if (fn.NUMBER_OF_KEYS !== undefined) {
        actualArgs.push(fn.NUMBER_OF_KEYS.toString());
    }
    actualArgs.push(...args);
    return actualArgs;
}
exports.fCallArguments = fCallArguments;
