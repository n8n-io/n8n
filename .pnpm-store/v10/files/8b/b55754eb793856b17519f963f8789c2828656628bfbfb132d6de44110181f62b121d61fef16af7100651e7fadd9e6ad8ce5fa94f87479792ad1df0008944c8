import { buildMessage, ValidateBy } from '../common/ValidateBy';
export const IS_ENUM = 'isEnum';
/**
 * Checks if a given value is the member of the provided enum.
 */
export function isEnum(value, entity) {
    const enumValues = Object.keys(entity).map(k => entity[k]);
    return enumValues.includes(value);
}
/**
 * Returns the possible values from an enum (both simple number indexed and string indexed enums).
 */
function validEnumValues(entity) {
    return Object.entries(entity)
        .filter(([key, value]) => isNaN(parseInt(key)))
        .map(([key, value]) => value);
}
/**
 * Checks if a given value is the member of the provided enum.
 */
export function IsEnum(entity, validationOptions) {
    return ValidateBy({
        name: IS_ENUM,
        constraints: [entity, validEnumValues(entity)],
        validator: {
            validate: (value, args) => isEnum(value, args === null || args === void 0 ? void 0 : args.constraints[0]),
            defaultMessage: buildMessage(eachPrefix => eachPrefix + '$property must be one of the following values: $constraint2', validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsEnum.js.map