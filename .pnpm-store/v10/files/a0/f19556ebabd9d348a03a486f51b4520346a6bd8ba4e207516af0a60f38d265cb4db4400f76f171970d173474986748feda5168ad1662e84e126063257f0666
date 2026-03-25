import { buildMessage, ValidateBy } from '../common/ValidateBy';
import isTaxIDValidator from 'validator/lib/isTaxID';
export const IS_TAX_ID = 'isTaxId';
/**
 * Checks if the string is a valid tax ID. Default locale is `en-US`.
 * If given value is not a string, then it returns false.
 *
 * Supported locales: bg-BG, cs-CZ, de-AT, de-DE, dk-DK, el-CY, el-GR, en-CA,
 * en-IE, en-US, es-ES, et-EE, fi-FI, fr-BE, fr-FR, fr-LU, hr-HR, hu-HU, it-IT,
 * lv-LV, mt-MT, nl-NL, pl-PL, pt-BR, pt-PT, ro-RO, sk-SK, sl-SI, sv-SE.
 */
export function isTaxId(value, locale) {
    return typeof value === 'string' && isTaxIDValidator(value, locale || 'en-US');
}
/**
 * Checks if the string is a valid tax ID. Default locale is `en-US`.
 * If given value is not a string, then it returns false.
 *
 * Supported locales: bg-BG, cs-CZ, de-AT, de-DE, dk-DK, el-CY, el-GR, en-CA,
 * en-IE, en-US, es-ES, et-EE, fi-FI, fr-BE, fr-FR, fr-LU, hr-HR, hu-HU, it-IT,
 * lv-LV, mt-MT, nl-NL, pl-PL, pt-BR, pt-PT, ro-RO, sk-SK, sl-SI, sv-SE.
 */
export function IsTaxId(locale, validationOptions) {
    return ValidateBy({
        name: IS_TAX_ID,
        constraints: [locale],
        validator: {
            validate: (value, args) => isTaxId(value, args === null || args === void 0 ? void 0 : args.constraints[0]),
            defaultMessage: buildMessage(eachPrefix => eachPrefix + '$property must be a Tax Identification Number', validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=is-tax-id.js.map