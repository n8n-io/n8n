import { defaultMetadataStorage } from '../storage';
/**
 * Specifies a type of the property.
 * The given TypeFunction can return a constructor. A discriminator can be given in the options.
 *
 * Can be applied to properties only.
 */
export function Type(typeFunction, options = {}) {
    return function (target, propertyName) {
        const reflectedType = Reflect.getMetadata('design:type', target, propertyName);
        defaultMetadataStorage.addTypeMetadata({
            target: target.constructor,
            propertyName: propertyName,
            reflectedType,
            typeFunction,
            options,
        });
    };
}
//# sourceMappingURL=type.decorator.js.map