"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsNotEmptyObject = exports.isNotEmptyObject = exports.IS_NOT_EMPTY_OBJECT = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const IsObject_1 = require("../typechecker/IsObject");
exports.IS_NOT_EMPTY_OBJECT = 'isNotEmptyObject';
/**
 * Checks if the value is valid Object & not empty.
 * Returns false if the value is not an object or an empty valid object.
 */
function isNotEmptyObject(value, options) {
    if (!(0, IsObject_1.isObject)(value)) {
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
exports.isNotEmptyObject = isNotEmptyObject;
/**
 * Checks if the value is valid Object & not empty.
 * Returns false if the value is not an object or an empty valid object.
 */
function IsNotEmptyObject(options, validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_NOT_EMPTY_OBJECT,
        constraints: [options],
        validator: {
            validate: (value, args) => isNotEmptyObject(value, args === null || args === void 0 ? void 0 : args.constraints[0]),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must be a non-empty object', validationOptions),
        },
    }, validationOptions);
}
exports.IsNotEmptyObject = IsNotEmptyObject;
//# sourceMappingURL=IsNotEmptyObject.js.map