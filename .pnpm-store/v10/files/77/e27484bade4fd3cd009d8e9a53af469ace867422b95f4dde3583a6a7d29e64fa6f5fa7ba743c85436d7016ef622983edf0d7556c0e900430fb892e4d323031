"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsLatLong = exports.isLatLong = exports.IS_LATLONG = void 0;
const ValidateBy_1 = require("./ValidateBy");
const isLatLong_1 = __importDefault(require("validator/lib/isLatLong"));
exports.IS_LATLONG = 'isLatLong';
/**
 * Checks if a value is string in format a "latitude,longitude".
 */
function isLatLong(value) {
    return typeof value === 'string' && (0, isLatLong_1.default)(value);
}
exports.isLatLong = isLatLong;
/**
 * Checks if a value is string in format a "latitude,longitude".
 */
function IsLatLong(validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_LATLONG,
        validator: {
            validate: (value, args) => isLatLong(value),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must be a latitude,longitude string', validationOptions),
        },
    }, validationOptions);
}
exports.IsLatLong = IsLatLong;
//# sourceMappingURL=IsLatLong.js.map