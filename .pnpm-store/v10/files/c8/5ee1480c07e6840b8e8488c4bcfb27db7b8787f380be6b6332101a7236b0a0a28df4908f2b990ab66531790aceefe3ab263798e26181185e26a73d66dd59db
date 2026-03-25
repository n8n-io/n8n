"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsMongoId = exports.isMongoId = exports.IS_MONGO_ID = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const isMongoId_1 = __importDefault(require("validator/lib/isMongoId"));
exports.IS_MONGO_ID = 'isMongoId';
/**
 * Checks if the string is a valid hex-encoded representation of a MongoDB ObjectId.
 * If given value is not a string, then it returns false.
 */
function isMongoId(value) {
    return typeof value === 'string' && (0, isMongoId_1.default)(value);
}
exports.isMongoId = isMongoId;
/**
 * Checks if the string is a valid hex-encoded representation of a MongoDB ObjectId.
 * If given value is not a string, then it returns false.
 */
function IsMongoId(validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_MONGO_ID,
        validator: {
            validate: (value, args) => isMongoId(value),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must be a mongodb id', validationOptions),
        },
    }, validationOptions);
}
exports.IsMongoId = IsMongoId;
//# sourceMappingURL=IsMongoId.js.map