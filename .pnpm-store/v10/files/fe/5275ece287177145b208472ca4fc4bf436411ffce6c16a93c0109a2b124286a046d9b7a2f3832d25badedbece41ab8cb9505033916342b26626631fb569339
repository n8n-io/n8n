"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsCreditCard = exports.isCreditCard = exports.IS_CREDIT_CARD = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const isCreditCard_1 = __importDefault(require("validator/lib/isCreditCard"));
exports.IS_CREDIT_CARD = 'isCreditCard';
/**
 * Checks if the string is a credit card.
 * If given value is not a string, then it returns false.
 */
function isCreditCard(value) {
    return typeof value === 'string' && (0, isCreditCard_1.default)(value);
}
exports.isCreditCard = isCreditCard;
/**
 * Checks if the string is a credit card.
 * If given value is not a string, then it returns false.
 */
function IsCreditCard(validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_CREDIT_CARD,
        validator: {
            validate: (value, args) => isCreditCard(value),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must be a credit card', validationOptions),
        },
    }, validationOptions);
}
exports.IsCreditCard = IsCreditCard;
//# sourceMappingURL=IsCreditCard.js.map