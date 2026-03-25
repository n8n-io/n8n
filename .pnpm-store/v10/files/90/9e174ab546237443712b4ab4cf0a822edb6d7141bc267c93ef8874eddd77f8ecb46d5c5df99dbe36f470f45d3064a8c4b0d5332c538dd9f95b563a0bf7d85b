import { buildMessage, ValidateBy } from '../common/ValidateBy';
import { isObject } from '../typechecker/IsObject';
export const IS_NOT_EMPTY_OBJECT = 'isNotEmptyObject';
/**
 * Checks if the value is valid Object & not empty.
 * Returns false if the value is not an object or an empty valid object.
 */
export function isNotEmptyObject(value, options) {
    if (!isObject(value)) {
        return false;
    }
    if ((options === null || options === void 0 ? void 0 : options.nullable) === true) {
        return !Object.values(value).every(propertyValue => propertyValue === null || propertyValue === undefined);
    }
    for (const key in value) {
        if (value.hasOwnProperty(key)) {
            return true;
        }
    }
    return false;
}
/**
 * Checks if the value is valid Object & not empty.
 * Returns false if the value is not an object or an empty valid object.
 */
export function IsNotEmptyObject(options, validationOptions) {
    return ValidateBy({
        name: IS_NOT_EMPTY_OBJECT,
        constraints: [options],
        validator: {
            validate: (value, args) => isNotEmptyObject(value, args === null || args === void 0 ? void 0 : args.constraints[0]),
            defaultMessage: buildMessage(eachPrefix => eachPrefix + '$property must be a non-empty object', validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsNotEmptyObject.js.map