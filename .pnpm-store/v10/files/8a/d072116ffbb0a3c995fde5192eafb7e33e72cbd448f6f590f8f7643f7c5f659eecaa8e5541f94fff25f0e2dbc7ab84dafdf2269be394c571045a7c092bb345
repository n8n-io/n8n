"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransformPlainToInstance = void 0;
const ClassTransformer_1 = require("../ClassTransformer");
/**
 * Return the class instance only with the exposed properties.
 *
 * Can be applied to functions and getters/setters only.
 */
function TransformPlainToInstance(classType, params) {
    return function (target, propertyKey, descriptor) {
        const classTransformer = new ClassTransformer_1.ClassTransformer();
        const originalMethod = descriptor.value;
        descriptor.value = function (...args) {
            const result = originalMethod.apply(this, args);
            const isPromise = !!result && (typeof result === 'object' || typeof result === 'function') && typeof result.then === 'function';
            return isPromise
                ? result.then((data) => classTransformer.plainToInstance(classType, data, params))
                : classTransformer.plainToInstance(classType, result, params);
        };
    };
}
exports.TransformPlainToInstance = TransformPlainToInstance;
//# sourceMappingURL=transform-plain-to-instance.decorator.js.map