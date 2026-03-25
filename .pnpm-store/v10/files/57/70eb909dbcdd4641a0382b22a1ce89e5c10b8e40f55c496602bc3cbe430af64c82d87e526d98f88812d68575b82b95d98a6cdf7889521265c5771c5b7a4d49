"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deserializeArray = exports.deserialize = exports.serialize = exports.classToClassFromExist = exports.instanceToInstance = exports.plainToClassFromExist = exports.plainToInstance = exports.plainToClass = exports.classToPlainFromExist = exports.instanceToPlain = exports.classToPlain = exports.ClassTransformer = void 0;
const ClassTransformer_1 = require("./ClassTransformer");
var ClassTransformer_2 = require("./ClassTransformer");
Object.defineProperty(exports, "ClassTransformer", { enumerable: true, get: function () { return ClassTransformer_2.ClassTransformer; } });
__exportStar(require("./decorators"), exports);
__exportStar(require("./interfaces"), exports);
__exportStar(require("./enums"), exports);
const classTransformer = new ClassTransformer_1.ClassTransformer();
function classToPlain(object, options) {
    return classTransformer.instanceToPlain(object, options);
}
exports.classToPlain = classToPlain;
function instanceToPlain(object, options) {
    return classTransformer.instanceToPlain(object, options);
}
exports.instanceToPlain = instanceToPlain;
function classToPlainFromExist(object, plainObject, options) {
    return classTransformer.classToPlainFromExist(object, plainObject, options);
}
exports.classToPlainFromExist = classToPlainFromExist;
function plainToClass(cls, plain, options) {
    return classTransformer.plainToInstance(cls, plain, options);
}
exports.plainToClass = plainToClass;
function plainToInstance(cls, plain, options) {
    return classTransformer.plainToInstance(cls, plain, options);
}
exports.plainToInstance = plainToInstance;
function plainToClassFromExist(clsObject, plain, options) {
    return classTransformer.plainToClassFromExist(clsObject, plain, options);
}
exports.plainToClassFromExist = plainToClassFromExist;
function instanceToInstance(object, options) {
    return classTransformer.instanceToInstance(object, options);
}
exports.instanceToInstance = instanceToInstance;
function classToClassFromExist(object, fromObject, options) {
    return classTransformer.classToClassFromExist(object, fromObject, options);
}
exports.classToClassFromExist = classToClassFromExist;
function serialize(object, options) {
    return classTransformer.serialize(object, options);
}
exports.serialize = serialize;
/**
 * Deserializes given JSON string to a object of the given class.
 *
 * @deprecated This function is being removed. Please use the following instead:
 * ```
 * instanceToClass(cls, JSON.parse(json), options)
 * ```
 */
function deserialize(cls, json, options) {
    return classTransformer.deserialize(cls, json, options);
}
exports.deserialize = deserialize;
/**
 * Deserializes given JSON string to an array of objects of the given class.
 *
 * @deprecated This function is being removed. Please use the following instead:
 * ```
 * JSON.parse(json).map(value => instanceToClass(cls, value, options))
 * ```
 *
 */
function deserializeArray(cls, json, options) {
    return classTransformer.deserializeArray(cls, json, options);
}
exports.deserializeArray = deserializeArray;
//# sourceMappingURL=index.js.map