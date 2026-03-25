"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassTransformer = void 0;
const TransformOperationExecutor_1 = require("./TransformOperationExecutor");
const enums_1 = require("./enums");
const default_options_constant_1 = require("./constants/default-options.constant");
class ClassTransformer {
    instanceToPlain(object, options) {
        const executor = new TransformOperationExecutor_1.TransformOperationExecutor(enums_1.TransformationType.CLASS_TO_PLAIN, {
            ...default_options_constant_1.defaultOptions,
            ...options,
        });
        return executor.transform(undefined, object, undefined, undefined, undefined, undefined);
    }
    classToPlainFromExist(object, plainObject, options) {
        const executor = new TransformOperationExecutor_1.TransformOperationExecutor(enums_1.TransformationType.CLASS_TO_PLAIN, {
            ...default_options_constant_1.defaultOptions,
            ...options,
        });
        return executor.transform(plainObject, object, undefined, undefined, undefined, undefined);
    }
    plainToInstance(cls, plain, options) {
        const executor = new TransformOperationExecutor_1.TransformOperationExecutor(enums_1.TransformationType.PLAIN_TO_CLASS, {
            ...default_options_constant_1.defaultOptions,
            ...options,
        });
        return executor.transform(undefined, plain, cls, undefined, undefined, undefined);
    }
    plainToClassFromExist(clsObject, plain, options) {
        const executor = new TransformOperationExecutor_1.TransformOperationExecutor(enums_1.TransformationType.PLAIN_TO_CLASS, {
            ...default_options_constant_1.defaultOptions,
            ...options,
        });
        return executor.transform(clsObject, plain, undefined, undefined, undefined, undefined);
    }
    instanceToInstance(object, options) {
        const executor = new TransformOperationExecutor_1.TransformOperationExecutor(enums_1.TransformationType.CLASS_TO_CLASS, {
            ...default_options_constant_1.defaultOptions,
            ...options,
        });
        return executor.transform(undefined, object, undefined, undefined, undefined, undefined);
    }
    classToClassFromExist(object, fromObject, options) {
        const executor = new TransformOperationExecutor_1.TransformOperationExecutor(enums_1.TransformationType.CLASS_TO_CLASS, {
            ...default_options_constant_1.defaultOptions,
            ...options,
        });
        return executor.transform(fromObject, object, undefined, undefined, undefined, undefined);
    }
    serialize(object, options) {
        return JSON.stringify(this.instanceToPlain(object, options));
    }
    /**
     * Deserializes given JSON string to a object of the given class.
     */
    deserialize(cls, json, options) {
        const jsonObject = JSON.parse(json);
        return this.plainToInstance(cls, jsonObject, options);
    }
    /**
     * Deserializes given JSON string to an array of objects of the given class.
     */
    deserializeArray(cls, json, options) {
        const jsonObject = JSON.parse(json);
        return this.plainToInstance(cls, jsonObject, options);
    }
}
exports.ClassTransformer = ClassTransformer;
//# sourceMappingURL=ClassTransformer.js.map