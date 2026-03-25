"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsISBN = exports.isISBN = exports.IS_ISBN = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const isISBN_1 = __importDefault(require("validator/lib/isISBN"));
exports.IS_ISBN = 'isIsbn';
/**
 * Checks if the string is an ISBN (version 10 or 13).
 * If given value is not a string, then it returns false.
 */
function isISBN(value, version) {
    /* eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion */
    const versionStr = version ? `${version}` : undefined;
    return typeof value === 'string' && (0, isISBN_1.default)(value, versionStr);
}
exports.isISBN = isISBN;
/**
 * Checks if the string is an ISBN (version 10 or 13).
 * If given value is not a string, then it returns false.
 */
function IsISBN(version, validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_ISBN,
        constraints: [version],
        validator: {
            validate: (value, args) => isISBN(value, args === null || args === void 0 ? void 0 : args.constraints[0]),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must be an ISBN', validationOptions),
        },
    }, validationOptions);
}
exports.IsISBN = IsISBN;
//# sourceMappingURL=IsISBN.js.map