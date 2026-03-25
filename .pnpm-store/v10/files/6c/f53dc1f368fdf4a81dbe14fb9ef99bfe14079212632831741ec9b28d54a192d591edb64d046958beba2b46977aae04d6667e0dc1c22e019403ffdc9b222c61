"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransformInstanceToPlain = void 0;
const ClassTransformer_1 = require("../ClassTransformer");
/**
 * Transform the object from class to plain object and return only with the exposed properties.
 *
 * Can be applied to functions and getters/setters only.
 */
function TransformInstanceToPlain(params) {
    return function (target, propertyKey, descriptor) {
        const classTransformer = new ClassTransformer_1.ClassTransformer();
        const originalMethod = descriptor.value;
        descriptor.value = function (...args) {
            const result = originalMethod.apply(this, args);
            const isPromise = !!result && (typeof result === 'object' || typeof result === 'function') && typeof result.then === 'function';
            return isPromise
                ? result.then((data) => classTransformer.instanceToPlain(data, params))
                : classTransformer.instanceToPlain(result, params);
        };
    };
}
exports.TransformInstanceToPlain = TransformInstanceToPlain;
//# sourceMappingURL=transform-instance-to-plain.decorator.js.map