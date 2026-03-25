import { buildMessage, ValidateBy } from '../common/ValidateBy';
import isEthereumAddressValidator from 'validator/lib/isEthereumAddress';
export var IS_ETHEREUM_ADDRESS = 'isEthereumAddress';
/**
 * Check if the string is an Ethereum address using basic regex. Does not validate address checksums.
 * If given value is not a string, then it returns false.
 */
export function isEthereumAddress(value) {
    return typeof value === 'string' && isEthereumAddressValidator(value);
}
/**
 * Check if the string is an Ethereum address using basic regex. Does not validate address checksums.
 * If given value is not a string, then it returns false.
 */
export function IsEthereumAddress(validationOptions) {
    return ValidateBy({
        name: IS_ETHEREUM_ADDRESS,
        validator: {
            validate: function (value, args) { return isEthereumAddress(value); },
            defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be an Ethereum address'; }, validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsEthereumAddress.js.map