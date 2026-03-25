"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidateNested = void 0;
const ValidationTypes_1 = require("../../validation/ValidationTypes");
const ValidationMetadata_1 = require("../../metadata/ValidationMetadata");
const MetadataStorage_1 = require("../../metadata/MetadataStorage");
/**
 * Objects / object arrays marked with this decorator will also be validated.
 */
function ValidateNested(validationOptions) {
    const opts = { ...validationOptions };
    const eachPrefix = opts.each ? 'each value in ' : '';
    opts.message = opts.message || eachPrefix + 'nested property $property must be either object or array';
    return function (object, propertyName) {
        const args = {
            type: ValidationTypes_1.ValidationTypes.NESTED_VALIDATION,
            target: object.constructor,
            propertyName: propertyName,
            validationOptions: opts,
        };
        (0, MetadataStorage_1.getMetadataStorage)().addValidationMetadata(new ValidationMetadata_1.ValidationMetadata(args));
    };
}
exports.ValidateNested = ValidateNested;
//# sourceMappingURL=ValidateNested.js.map