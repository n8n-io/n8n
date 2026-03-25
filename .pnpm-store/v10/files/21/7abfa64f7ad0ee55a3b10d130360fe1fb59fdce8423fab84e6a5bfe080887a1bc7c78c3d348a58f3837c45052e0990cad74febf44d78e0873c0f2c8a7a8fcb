var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import { ValidationTypes } from '../../validation/ValidationTypes';
import { ValidationMetadata } from '../../metadata/ValidationMetadata';
import { getMetadataStorage } from '../../metadata/MetadataStorage';
/**
 * Objects / object arrays marked with this decorator will also be validated.
 */
export function ValidateNested(validationOptions) {
    var opts = __assign({}, validationOptions);
    var eachPrefix = opts.each ? 'each value in ' : '';
    opts.message = opts.message || eachPrefix + 'nested property $property must be either object or array';
    return function (object, propertyName) {
        var args = {
            type: ValidationTypes.NESTED_VALIDATION,
            target: object.constructor,
            propertyName: propertyName,
            validationOptions: opts,
        };
        getMetadataStorage().addValidationMetadata(new ValidationMetadata(args));
    };
}
//# sourceMappingURL=ValidateNested.js.map