"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Transform = void 0;
const storage_1 = require("../storage");
/**
 * Defines a custom logic for value transformation.
 *
 * Can be applied to properties only.
 */
function Transform(transformFn, options = {}) {
    return function (target, propertyName) {
        storage_1.defaultMetadataStorage.addTransformMetadata({
            target: target.constructor,
            propertyName: propertyName,
            transformFn,
            options,
        });
    };
}
exports.Transform = Transform;
//# sourceMappingURL=transform.decorator.js.map