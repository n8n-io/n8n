"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Validate = exports.ValidatorConstraint = void 0;
const ValidationMetadata_1 = require("../../metadata/ValidationMetadata");
const MetadataStorage_1 = require("../../metadata/MetadataStorage");
const ValidationTypes_1 = require("../../validation/ValidationTypes");
const ConstraintMetadata_1 = require("../../metadata/ConstraintMetadata");
/**
 * Registers custom validator class.
 */
function ValidatorConstraint(options) {
    return function (target) {
        const isAsync = options && options.async;
        let name = options && options.name ? options.name : '';
        if (!name) {
            name = target.name;
            if (!name)
                // generate name if it was not given
                name = name.replace(/\.?([A-Z]+)/g, (x, y) => '_' + y.toLowerCase()).replace(/^_/, '');
        }
        const metadata = new ConstraintMetadata_1.ConstraintMetadata(target, name, isAsync);
        (0, MetadataStorage_1.getMetadataStorage)().addConstraintMetadata(metadata);
    };
}
exports.ValidatorConstraint = ValidatorConstraint;
function Validate(constraintClass, constraintsOrValidationOptions, maybeValidationOptions) {
    return function (object, propertyName) {
        const args = {
            type: ValidationTypes_1.ValidationTypes.CUSTOM_VALIDATION,
            target: object.constructor,
            propertyName: propertyName,
            constraintCls: constraintClass,
            constraints: Array.isArray(constraintsOrValidationOptions) ? constraintsOrValidationOptions : undefined,
            validationOptions: !Array.isArray(constraintsOrValidationOptions)
                ? constraintsOrValidationOptions
                : maybeValidationOptions,
        };
        (0, MetadataStorage_1.getMetadataStorage)().addValidationMetadata(new ValidationMetadata_1.ValidationMetadata(args));
    };
}
exports.Validate = Validate;
//# sourceMappingURL=Validate.js.map