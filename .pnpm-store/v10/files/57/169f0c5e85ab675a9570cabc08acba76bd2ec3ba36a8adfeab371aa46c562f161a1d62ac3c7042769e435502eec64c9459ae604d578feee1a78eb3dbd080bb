"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Type = void 0;
const storage_1 = require("../storage");
/**
 * Specifies a type of the property.
 * The given TypeFunction can return a constructor. A discriminator can be given in the options.
 *
 * Can be applied to properties only.
 */
function Type(typeFunction, options = {}) {
    return function (target, propertyName) {
        const reflectedType = Reflect.getMetadata('design:type', target, propertyName);
        storage_1.defaultMetadataStorage.addTypeMetadata({
            target: target.constructor,
            propertyName: propertyName,
            reflectedType,
            typeFunction,
            options,
        });
    };
}
exports.Type = Type;
//# sourceMappingURL=type.decorator.js.map