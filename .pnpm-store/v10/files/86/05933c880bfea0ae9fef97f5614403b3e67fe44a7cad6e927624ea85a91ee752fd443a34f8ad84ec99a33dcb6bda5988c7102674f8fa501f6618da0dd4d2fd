"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidatePromise = void 0;
const ValidationTypes_1 = require("../../validation/ValidationTypes");
const ValidationMetadata_1 = require("../../metadata/ValidationMetadata");
const MetadataStorage_1 = require("../../metadata/MetadataStorage");
/**
 * Resolve promise before validation
 */
function ValidatePromise(validationOptions) {
    return function (object, propertyName) {
        const args = {
            type: ValidationTypes_1.ValidationTypes.PROMISE_VALIDATION,
            target: object.constructor,
            propertyName: propertyName,
            validationOptions: validationOptions,
        };
        (0, MetadataStorage_1.getMetadataStorage)().addValidationMetadata(new ValidationMetadata_1.ValidationMetadata(args));
    };
}
exports.ValidatePromise = ValidatePromise;
//# sourceMappingURL=ValidatePromise.js.map