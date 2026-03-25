"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
const generic_transformers_1 = require("@redis/client/dist/lib/commands/generic-transformers");
exports.FIRST_KEY_INDEX = 1;
function transformArguments(key, items, options) {
    const args = ['BF.INSERT', key];
    if (options?.CAPACITY) {
        args.push('CAPACITY', options.CAPACITY.toString());
    }
    if (options?.ERROR) {
        args.push('ERROR', options.ERROR.toString());
    }
    if (options?.EXPANSION) {
        args.push('EXPANSION', options.EXPANSION.toString());
    }
    if (options?.NOCREATE) {
        args.push('NOCREATE');
    }
    if (options?.NONSCALING) {
        args.push('NONSCALING');
    }
    args.push('ITEMS');
    return (0, generic_transformers_1.pushVerdictArguments)(args, items);
}
exports.transformArguments = transformArguments;
var generic_transformers_2 = require("@redis/client/dist/lib/commands/generic-transformers");
Object.defineProperty(exports, "transformReply", { enumerable: true, get: function () { return generic_transformers_2.transformBooleanArrayReply; } });
