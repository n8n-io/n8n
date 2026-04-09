"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getKeyIndexes = exports.hasFlag = exports.exists = exports.list = void 0;
const commands_json_1 = __importDefault(require("./commands.json"));
/**
 * Redis command list
 *
 * All commands are lowercased.
 */
exports.list = Object.keys(commands_json_1.default);
const flags = {};
exports.list.forEach((commandName) => {
    flags[commandName] = commands_json_1.default[commandName].flags.reduce(function (flags, flag) {
        flags[flag] = true;
        return flags;
    }, {});
});
/**
 * Check if the command exists
 */
function exists(commandName, options) {
    commandName = (options === null || options === void 0 ? void 0 : options.caseInsensitive)
        ? String(commandName).toLowerCase()
        : commandName;
    return Boolean(commands_json_1.default[commandName]);
}
exports.exists = exists;
/**
 * Check if the command has the flag
 *
 * Some of possible flags: readonly, noscript, loading
 */
function hasFlag(commandName, flag, options) {
    commandName = (options === null || options === void 0 ? void 0 : options.nameCaseInsensitive)
        ? String(commandName).toLowerCase()
        : commandName;
    if (!flags[commandName]) {
        throw new Error("Unknown command " + commandName);
    }
    return Boolean(flags[commandName][flag]);
}
exports.hasFlag = hasFlag;
/**
 * Get indexes of keys in the command arguments
 *
 * @example
 * ```javascript
 * getKeyIndexes('set', ['key', 'value']) // [0]
 * getKeyIndexes('mget', ['key1', 'key2']) // [0, 1]
 * ```
 */
function getKeyIndexes(commandName, args, options) {
    commandName = (options === null || options === void 0 ? void 0 : options.nameCaseInsensitive)
        ? String(commandName).toLowerCase()
        : commandName;
    const command = commands_json_1.default[commandName];
    if (!command) {
        throw new Error("Unknown command " + commandName);
    }
    if (!Array.isArray(args)) {
        throw new Error("Expect args to be an array");
    }
    const keys = [];
    const parseExternalKey = Boolean(options && options.parseExternalKey);
    const takeDynamicKeys = (args, startIndex) => {
        const keys = [];
        const keyStop = Number(args[startIndex]);
        for (let i = 0; i < keyStop; i++) {
            keys.push(i + startIndex + 1);
        }
        return keys;
    };
    const takeKeyAfterToken = (args, startIndex, token) => {
        for (let i = startIndex; i < args.length - 1; i += 1) {
            if (String(args[i]).toLowerCase() === token.toLowerCase()) {
                return i + 1;
            }
        }
        return null;
    };
    switch (commandName) {
        case "zunionstore":
        case "zinterstore":
        case "zdiffstore":
            keys.push(0, ...takeDynamicKeys(args, 1));
            break;
        case "eval":
        case "evalsha":
        case "eval_ro":
        case "evalsha_ro":
        case "fcall":
        case "fcall_ro":
        case "blmpop":
        case "bzmpop":
            keys.push(...takeDynamicKeys(args, 1));
            break;
        case "sintercard":
        case "lmpop":
        case "zunion":
        case "zinter":
        case "zmpop":
        case "zintercard":
        case "zdiff": {
            keys.push(...takeDynamicKeys(args, 0));
            break;
        }
        case "georadius": {
            keys.push(0);
            const storeKey = takeKeyAfterToken(args, 5, "STORE");
            if (storeKey)
                keys.push(storeKey);
            const distKey = takeKeyAfterToken(args, 5, "STOREDIST");
            if (distKey)
                keys.push(distKey);
            break;
        }
        case "georadiusbymember": {
            keys.push(0);
            const storeKey = takeKeyAfterToken(args, 4, "STORE");
            if (storeKey)
                keys.push(storeKey);
            const distKey = takeKeyAfterToken(args, 4, "STOREDIST");
            if (distKey)
                keys.push(distKey);
            break;
        }
        case "sort":
        case "sort_ro":
            keys.push(0);
            for (let i = 1; i < args.length - 1; i++) {
                let arg = args[i];
                if (typeof arg !== "string") {
                    continue;
                }
                const directive = arg.toUpperCase();
                if (directive === "GET") {
                    i += 1;
                    arg = args[i];
                    if (arg !== "#") {
                        if (parseExternalKey) {
                            keys.push([i, getExternalKeyNameLength(arg)]);
                        }
                        else {
                            keys.push(i);
                        }
                    }
                }
                else if (directive === "BY") {
                    i += 1;
                    if (parseExternalKey) {
                        keys.push([i, getExternalKeyNameLength(args[i])]);
                    }
                    else {
                        keys.push(i);
                    }
                }
                else if (directive === "STORE") {
                    i += 1;
                    keys.push(i);
                }
            }
            break;
        case "migrate":
            if (args[2] === "") {
                for (let i = 5; i < args.length - 1; i++) {
                    const arg = args[i];
                    if (typeof arg === "string" && arg.toUpperCase() === "KEYS") {
                        for (let j = i + 1; j < args.length; j++) {
                            keys.push(j);
                        }
                        break;
                    }
                }
            }
            else {
                keys.push(2);
            }
            break;
        case "xreadgroup":
        case "xread":
            // Keys are 1st half of the args after STREAMS argument.
            for (let i = commandName === "xread" ? 0 : 3; i < args.length - 1; i++) {
                if (String(args[i]).toUpperCase() === "STREAMS") {
                    for (let j = i + 1; j <= i + (args.length - 1 - i) / 2; j++) {
                        keys.push(j);
                    }
                    break;
                }
            }
            break;
        default:
            // Step has to be at least one in this case, otherwise the command does
            // not contain a key.
            if (command.step > 0) {
                const keyStart = command.keyStart - 1;
                const keyStop = command.keyStop > 0
                    ? command.keyStop
                    : args.length + command.keyStop + 1;
                for (let i = keyStart; i < keyStop; i += command.step) {
                    keys.push(i);
                }
            }
            break;
    }
    return keys;
}
exports.getKeyIndexes = getKeyIndexes;
function getExternalKeyNameLength(key) {
    if (typeof key !== "string") {
        key = String(key);
    }
    const hashPos = key.indexOf("->");
    return hashPos === -1 ? key.length : hashPos;
}
