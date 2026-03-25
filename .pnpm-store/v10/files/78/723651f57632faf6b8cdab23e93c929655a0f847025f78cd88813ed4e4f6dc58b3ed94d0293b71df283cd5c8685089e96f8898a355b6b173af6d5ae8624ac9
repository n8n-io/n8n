"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Matches = exports.matches = exports.MATCHES = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const matches_1 = __importDefault(require("validator/lib/matches"));
exports.MATCHES = 'matches';
function matches(value, pattern, modifiers) {
    return typeof value === 'string' && (0, matches_1.default)(value, pattern, modifiers);
}
exports.matches = matches;
function Matches(pattern, modifiersOrAnnotationOptions, validationOptions) {
    let modifiers;
    if (modifiersOrAnnotationOptions && modifiersOrAnnotationOptions instanceof Object && !validationOptions) {
        validationOptions = modifiersOrAnnotationOptions;
    }
    else {
        modifiers = modifiersOrAnnotationOptions;
    }
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.MATCHES,
        constraints: [pattern, modifiers],
        validator: {
            validate: (value, args) => matches(value, args === null || args === void 0 ? void 0 : args.constraints[0], args === null || args === void 0 ? void 0 : args.constraints[1]),
            defaultMessage: (0, ValidateBy_1.buildMessage)((eachPrefix, args) => eachPrefix + '$property must match $constraint1 regular expression', validationOptions),
        },
    }, validationOptions);
}
exports.Matches = Matches;
//# sourceMappingURL=Matches.js.map