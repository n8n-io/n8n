"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsEthereumAddress = exports.isEthereumAddress = exports.IS_ETHEREUM_ADDRESS = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const isEthereumAddress_1 = __importDefault(require("validator/lib/isEthereumAddress"));
exports.IS_ETHEREUM_ADDRESS = 'isEthereumAddress';
/**
 * Check if the string is an Ethereum address using basic regex. Does not validate address checksums.
 * If given value is not a string, then it returns false.
 */
function isEthereumAddress(value) {
    return typeof value === 'string' && (0, isEthereumAddress_1.default)(value);
}
exports.isEthereumAddress = isEthereumAddress;
/**
 * Check if the string is an Ethereum address using basic regex. Does not validate address checksums.
 * If given value is not a string, then it returns false.
 */
function IsEthereumAddress(validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_ETHEREUM_ADDRESS,
        validator: {
            validate: (value, args) => isEthereumAddress(value),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must be an Ethereum address', validationOptions),
        },
    }, validationOptions);
}
exports.IsEthereumAddress = IsEthereumAddress;
//# sourceMappingURL=IsEthereumAddress.js.map