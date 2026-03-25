import { isValidationOptions } from '../ValidationOptions';
import { buildMessage, ValidateBy } from '../common/ValidateBy';
import isMacAddressValidator from 'validator/lib/isMACAddress';
export const IS_MAC_ADDRESS = 'isMacAddress';
/**
 * Check if the string is a MAC address.
 * If given value is not a string, then it returns false.
 */
export function isMACAddress(value, options) {
    return typeof value === 'string' && isMacAddressValidator(value, options);
}
export function IsMACAddress(optionsOrValidationOptionsArg, validationOptionsArg) {
    const options = !isValidationOptions(optionsOrValidationOptionsArg) ? optionsOrValidationOptionsArg : undefined;
    const validationOptions = isValidationOptions(optionsOrValidationOptionsArg)
        ? optionsOrValidationOptionsArg
        : validationOptionsArg;
    return ValidateBy({
        name: IS_MAC_ADDRESS,
        constraints: [options],
        validator: {
            validate: (value, args) => isMACAddress(value, options),
            defaultMessage: buildMessage(eachPrefix => eachPrefix + '$property must be a MAC Address', validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsMacAddress.js.map