import { defaultMetadataStorage } from '../storage';
/**
 * Defines a custom logic for value transformation.
 *
 * Can be applied to properties only.
 */
export function Transform(transformFn, options) {
    if (options === void 0) { options = {}; }
    return function (target, propertyName) {
        defaultMetadataStorage.addTransformMetadata({
            target: target.constructor,
            propertyName: propertyName,
            transformFn: transformFn,
            options: options,
        });
    };
}
//# sourceMappingURL=transform.decorator.js.map