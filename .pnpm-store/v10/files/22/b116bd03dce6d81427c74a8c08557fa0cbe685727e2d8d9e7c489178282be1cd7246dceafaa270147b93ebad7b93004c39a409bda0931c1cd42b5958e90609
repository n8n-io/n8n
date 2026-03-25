import { isValidationOptions } from '../ValidationOptions';
import { buildMessage, ValidateBy } from '../common/ValidateBy';
import isMacAddressValidator from 'validator/lib/isMACAddress';
export var IS_MAC_ADDRESS = 'isMacAddress';
/**
 * Check if the string is a MAC address.
 * If given value is not a string, then it returns false.
 */
export function isMACAddress(value, options) {
    return typeof value === 'string' && isMacAddressValidator(value, options);
}
export function IsMACAddress(optionsOrValidationOptionsArg, validationOptionsArg) {
    var options = !isValidationOptions(optionsOrValidationOptionsArg) ? optionsOrValidationOptionsArg : undefined;
    var validationOptions = isValidationOptions(optionsOrValidationOptionsArg)
        ? optionsOrValidationOptionsArg
        : validationOptionsArg;
    return ValidateBy({
        name: IS_MAC_ADDRESS,
        constraints: [options],
        validator: {
            validate: function (value, args) { return isMACAddress(value, options); },
            defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a MAC Address'; }, validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsMacAddress.js.map