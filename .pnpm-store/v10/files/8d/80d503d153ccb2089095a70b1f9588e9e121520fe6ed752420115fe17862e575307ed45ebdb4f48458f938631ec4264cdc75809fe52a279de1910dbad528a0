"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidateIf = void 0;
const ValidationTypes_1 = require("../../validation/ValidationTypes");
const ValidationMetadata_1 = require("../../metadata/ValidationMetadata");
const MetadataStorage_1 = require("../../metadata/MetadataStorage");
/**
 * Ignores the other validators on a property when the provided condition function returns false.
 */
function ValidateIf(condition, validationOptions) {
    return function (object, propertyName) {
        const args = {
            type: ValidationTypes_1.ValidationTypes.CONDITIONAL_VALIDATION,
            target: object.constructor,
            propertyName: propertyName,
            constraints: [condition],
            validationOptions: validationOptions,
        };
        (0, MetadataStorage_1.getMetadataStorage)().addValidationMetadata(new ValidationMetadata_1.ValidationMetadata(args));
    };
}
exports.ValidateIf = ValidateIf;
//# sourceMappingURL=ValidateIf.js.map