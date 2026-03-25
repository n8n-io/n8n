"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsIP = exports.isIP = exports.IS_IP = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const isIP_1 = __importDefault(require("validator/lib/isIP"));
exports.IS_IP = 'isIp';
/**
 * Checks if the string is an IP (version 4 or 6).
 * If given value is not a string, then it returns false.
 */
function isIP(value, version) {
    /* eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion */
    const versionStr = version ? `${version}` : undefined;
    return typeof value === 'string' && (0, isIP_1.default)(value, versionStr);
}
exports.isIP = isIP;
/**
 * Checks if the string is an IP (version 4 or 6).
 * If given value is not a string, then it returns false.
 */
function IsIP(version, validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_IP,
        constraints: [version],
        validator: {
            validate: (value, args) => isIP(value, args === null || args === void 0 ? void 0 : args.constraints[0]),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must be an ip address', validationOptions),
        },
    }, validationOptions);
}
exports.IsIP = IsIP;
//# sourceMappingURL=IsIP.js.map