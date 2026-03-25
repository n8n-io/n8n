var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
import { buildMessage, ValidateBy } from '../common/ValidateBy';
export var IS_ENUM = 'isEnum';
/**
 * Checks if a given value is the member of the provided enum.
 */
export function isEnum(value, entity) {
    var enumValues = Object.keys(entity).map(function (k) { return entity[k]; });
    return enumValues.includes(value);
}
/**
 * Returns the possible values from an enum (both simple number indexed and string indexed enums).
 */
function validEnumValues(entity) {
    return Object.entries(entity)
        .filter(function (_a) {
        var _b = __read(_a, 2), key = _b[0], value = _b[1];
        return isNaN(parseInt(key));
    })
        .map(function (_a) {
        var _b = __read(_a, 2), key = _b[0], value = _b[1];
        return value;
    });
}
/**
 * Checks if a given value is the member of the provided enum.
 */
export function IsEnum(entity, validationOptions) {
    return ValidateBy({
        name: IS_ENUM,
        constraints: [entity, validEnumValues(entity)],
        validator: {
            validate: function (value, args) { return isEnum(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
            defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be one of the following values: $constraint2'; }, validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsEnum.js.map