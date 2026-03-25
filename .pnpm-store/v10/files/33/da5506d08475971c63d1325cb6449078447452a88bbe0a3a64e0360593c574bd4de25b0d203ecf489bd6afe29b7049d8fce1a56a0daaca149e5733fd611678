"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsMilitaryTime = exports.isMilitaryTime = exports.IS_MILITARY_TIME = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const matches_1 = __importDefault(require("validator/lib/matches"));
exports.IS_MILITARY_TIME = 'isMilitaryTime';
/**
 * Checks if the string represents a time without a given timezone in the format HH:MM (military)
 * If the given value does not match the pattern HH:MM, then it returns false.
 */
function isMilitaryTime(value) {
    const militaryTimeRegex = /^([01]\d|2[0-3]):?([0-5]\d)$/;
    return typeof value === 'string' && (0, matches_1.default)(value, militaryTimeRegex);
}
exports.isMilitaryTime = isMilitaryTime;
/**
 * Checks if the string represents a time without a given timezone in the format HH:MM (military)
 * If the given value does not match the pattern HH:MM, then it returns false.
 */
function IsMilitaryTime(validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_MILITARY_TIME,
        validator: {
            validate: (value, args) => isMilitaryTime(value),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must be a valid representation of military time in the format HH:MM', validationOptions),
        },
    }, validationOptions);
}
exports.IsMilitaryTime = IsMilitaryTime;
//# sourceMappingURL=IsMilitaryTime.js.map