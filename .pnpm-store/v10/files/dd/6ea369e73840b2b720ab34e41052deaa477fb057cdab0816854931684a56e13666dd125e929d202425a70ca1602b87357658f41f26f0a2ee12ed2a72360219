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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.template = template;
exports.standardizeIDFromArgv = standardizeIDFromArgv;
exports.getHelpFlagAdditions = getHelpFlagAdditions;
exports.formatFlagDeprecationWarning = formatFlagDeprecationWarning;
exports.formatCommandDeprecationWarning = formatCommandDeprecationWarning;
exports.normalizeArgv = normalizeArgv;
const ejs = __importStar(require("ejs"));
const util_1 = require("../config/util");
const ids_1 = require("../util/ids");
function template(context) {
    function render(t) {
        return ejs.render(t, context);
    }
    return render;
}
const isFlag = (s) => s.startsWith('-');
const isArgWithValue = (s) => s.includes('=');
function collateSpacedCmdIDFromArgs(argv, config) {
    if (argv.length === 1)
        return argv;
    const findId = (argv) => {
        const ids = (0, util_1.collectUsableIds)(config.commandIDs);
        const final = [];
        const idPresent = (id) => ids.has(id);
        const finalizeId = (s) => (s ? [...final, s] : final).filter(Boolean).join(':');
        const hasArgs = () => {
            const id = finalizeId();
            if (!id)
                return false;
            const cmd = config.findCommand(id);
            return Boolean(cmd && (cmd.strict === false || Object.keys(cmd.args ?? {}).length > 0));
        };
        for (const arg of argv) {
            if (idPresent(finalizeId(arg)))
                final.push(arg);
            // If the parent topic has a command that expects positional arguments, then we cannot
            // assume that any subsequent string could be part of the command name
            else if (isArgWithValue(arg) || isFlag(arg) || hasArgs())
                break;
            else
                final.push(arg);
        }
        return finalizeId();
    };
    const id = findId(argv);
    if (id) {
        const argvSlice = argv.slice(id.split(':').length);
        return [id, ...argvSlice];
    }
    return argv; // ID is argv[0]
}
function standardizeIDFromArgv(argv, config) {
    if (argv.length === 0)
        return argv;
    if (config.topicSeparator === ' ')
        argv = collateSpacedCmdIDFromArgs(argv, config);
    else if (config.topicSeparator !== ':')
        argv[0] = (0, ids_1.toStandardizedId)(argv[0], config);
    return argv;
}
function getHelpFlagAdditions(config) {
    const helpFlags = ['--help'];
    const additionalHelpFlags = config.pjson.oclif.additionalHelpFlags ?? [];
    return [...new Set([...additionalHelpFlags, ...helpFlags]).values()];
}
function formatFlagDeprecationWarning(flag, opts) {
    let message = `The "${flag}" flag has been deprecated`;
    if (opts === true)
        return `${message}.`;
    if (opts.message)
        return opts.message;
    if (opts.version) {
        message += ` and will be removed in version ${opts.version}`;
    }
    message += opts.to ? `. Use "${opts.to}" instead.` : '.';
    return message;
}
function formatCommandDeprecationWarning(command, opts) {
    let message = `The "${command}" command has been deprecated`;
    if (!opts)
        return `${message}.`;
    if (opts.message)
        return opts.message;
    if (opts.version) {
        message += ` and will be removed in version ${opts.version}`;
    }
    message += opts.to ? `. Use "${opts.to}" instead.` : '.';
    return message;
}
function normalizeArgv(config, argv = process.argv.slice(2)) {
    if (config.topicSeparator !== ':' && !argv[0]?.includes(':'))
        argv = standardizeIDFromArgv(argv, config);
    return argv;
}
