import { ClassTransformer } from '../ClassTransformer';
/**
 * Return the class instance only with the exposed properties.
 *
 * Can be applied to functions and getters/setters only.
 */
export function TransformPlainToInstance(classType, params) {
    return function (target, propertyKey, descriptor) {
        var classTransformer = new ClassTransformer();
        var originalMethod = descriptor.value;
        descriptor.value = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            var result = originalMethod.apply(this, args);
            var isPromise = !!result && (typeof result === 'object' || typeof result === 'function') && typeof result.then === 'function';
            return isPromise
                ? result.then(function (data) { return classTransformer.plainToInstance(classType, data, params); })
                : classTransformer.plainToInstance(classType, result, params);
        };
    };
}
//# sourceMappingURL=transform-plain-to-instance.decorator.js.map