"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationUtils = exports.constraintToString = void 0;
/**
 * Convert the constraint to a string to be shown in an error
 */
function constraintToString(constraint) {
    if (Array.isArray(constraint)) {
        return constraint.join(', ');
    }
    if (typeof constraint === 'symbol') {
        constraint = constraint.description;
    }
    return `${constraint}`;
}
exports.constraintToString = constraintToString;
class ValidationUtils {
    static replaceMessageSpecialTokens(message, validationArguments) {
        let messageString;
        if (message instanceof Function) {
            messageString = message(validationArguments);
        }
        else if (typeof message === 'string') {
            messageString = message;
        }
        if (messageString && Array.isArray(validationArguments.constraints)) {
            validationArguments.constraints.forEach((constraint, index) => {
                messageString = messageString.replace(new RegExp(`\\$constraint${index + 1}`, 'g'), constraintToString(constraint));
            });
        }
        if (messageString &&
            validationArguments.value !== undefined &&
            validationArguments.value !== null &&
            typeof validationArguments.value === 'string')
            messageString = messageString.replace(/\$value/g, validationArguments.value);
        if (messageString)
            messageString = messageString.replace(/\$property/g, validationArguments.property);
        if (messageString)
            messageString = messageString.replace(/\$target/g, validationArguments.targetName);
        return messageString;
    }
}
exports.ValidationUtils = ValidationUtils;
//# sourceMappingURL=ValidationUtils.js.map