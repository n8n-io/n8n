"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUuid5 = void 0;
const uuid_1 = require("uuid");
// Generates UUIDv5, used to consistently generate the same UUID for
// a specific identifier and namespace
function generateUuid5(identifier, namespace = '') {
    const stringified = identifier.toString() + namespace.toString();
    return (0, uuid_1.v5)(stringified, uuid_1.v5.DNS).toString();
}
exports.generateUuid5 = generateUuid5;
