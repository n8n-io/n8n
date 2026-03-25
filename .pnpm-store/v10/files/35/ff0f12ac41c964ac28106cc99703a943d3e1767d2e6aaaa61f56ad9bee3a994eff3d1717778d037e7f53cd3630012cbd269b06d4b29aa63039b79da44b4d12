"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsJSON = exports.isJSON = exports.IS_JSON = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const isJSON_1 = __importDefault(require("validator/lib/isJSON"));
exports.IS_JSON = 'isJson';
/**
 * Checks if the string is valid JSON (note: uses JSON.parse).
 * If given value is not a string, then it returns false.
 */
function isJSON(value) {
    return typeof value === 'string' && (0, isJSON_1.default)(value);
}
exports.isJSON = isJSON;
/**
 * Checks if the string is valid JSON (note: uses JSON.parse).
 * If given value is not a string, then it returns false.
 */
function IsJSON(validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_JSON,
        validator: {
            validate: (value, args) => isJSON(value),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must be a json string', validationOptions),
        },
    }, validationOptions);
}
exports.IsJSON = IsJSON;
//# sourceMappingURL=IsJSON.js.map