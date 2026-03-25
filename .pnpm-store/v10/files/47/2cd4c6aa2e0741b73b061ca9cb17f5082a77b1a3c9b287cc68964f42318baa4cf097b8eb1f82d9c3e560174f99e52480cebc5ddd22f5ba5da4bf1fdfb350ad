import { buildMessage, ValidateBy } from '../common/ValidateBy';
import matchesValidator from 'validator/lib/matches';
export var IS_MILITARY_TIME = 'isMilitaryTime';
/**
 * Checks if the string represents a time without a given timezone in the format HH:MM (military)
 * If the given value does not match the pattern HH:MM, then it returns false.
 */
export function isMilitaryTime(value) {
    var militaryTimeRegex = /^([01]\d|2[0-3]):?([0-5]\d)$/;
    return typeof value === 'string' && matchesValidator(value, militaryTimeRegex);
}
/**
 * Checks if the string represents a time without a given timezone in the format HH:MM (military)
 * If the given value does not match the pattern HH:MM, then it returns false.
 */
export function IsMilitaryTime(validationOptions) {
    return ValidateBy({
        name: IS_MILITARY_TIME,
        validator: {
            validate: function (value, args) { return isMilitaryTime(value); },
            defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a valid representation of military time in the format HH:MM'; }, validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsMilitaryTime.js.map