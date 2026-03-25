"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
const generic_transformers_1 = require("@redis/client/dist/lib/commands/generic-transformers");
exports.FIRST_KEY_INDEX = 1;
exports.IS_READ_ONLY = true;
function transformArguments(key, options) {
    let args = ['JSON.GET', key];
    if (options?.path) {
        args = (0, generic_transformers_1.pushVerdictArguments)(args, options.path);
    }
    if (options?.INDENT) {
        args.push('INDENT', options.INDENT);
    }
    if (options?.NEWLINE) {
        args.push('NEWLINE', options.NEWLINE);
    }
    if (options?.SPACE) {
        args.push('SPACE', options.SPACE);
    }
    if (options?.NOESCAPE) {
        args.push('NOESCAPE');
    }
    return args;
}
exports.transformArguments = transformArguments;
var _1 = require(".");
Object.defineProperty(exports, "transformReply", { enumerable: true, get: function () { return _1.transformRedisJsonNullReply; } });
