"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformReply = exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
const generic_transformers_1 = require("./generic-transformers");
exports.FIRST_KEY_INDEX = 1;
exports.IS_READ_ONLY = true;
function transformArguments(key, member) {
    return (0, generic_transformers_1.pushVerdictArguments)(['GEOPOS', key], member);
}
exports.transformArguments = transformArguments;
function transformReply(reply) {
    return reply.map(coordinates => coordinates === null ? null : {
        longitude: coordinates[0],
        latitude: coordinates[1]
    });
}
exports.transformReply = transformReply;
