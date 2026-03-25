"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.FIRST_KEY_INDEX = void 0;
exports.FIRST_KEY_INDEX = 1;
function transformArguments(source, destination, options) {
    const args = ['COPY', source, destination];
    if (options?.destinationDb) {
        args.push('DB', options.destinationDb.toString());
    }
    if (options?.replace) {
        args.push('REPLACE');
    }
    return args;
}
exports.transformArguments = transformArguments;
var generic_transformers_1 = require("./generic-transformers");
Object.defineProperty(exports, "transformReply", { enumerable: true, get: function () { return generic_transformers_1.transformBooleanReply; } });
