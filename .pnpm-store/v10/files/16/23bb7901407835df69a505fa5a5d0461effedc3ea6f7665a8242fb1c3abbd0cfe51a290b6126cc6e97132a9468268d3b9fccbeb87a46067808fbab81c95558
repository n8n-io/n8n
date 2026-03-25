"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Slugify = exports.defaultOptions = void 0;
const transliterate_1 = require("./transliterate");
const utils_1 = require("./utils");
// Slugify
exports.defaultOptions = Object.assign(Object.assign({}, (0, utils_1.deepClone)(transliterate_1.defaultOptions)), { allowedChars: 'a-zA-Z0-9-_.~', lowercase: true, separator: '-', uppercase: false, fixChineseSpacing: true });
class Slugify extends transliterate_1.Transliterate {
    get options() {
        return (0, utils_1.deepClone)(Object.assign(Object.assign({}, exports.defaultOptions), this.confOptions));
    }
    /**
     * Set default config
     * @param options
     */
    config(options, reset = false) {
        if (reset) {
            this.confOptions = {};
        }
        if (options && typeof options === 'object') {
            this.confOptions = (0, utils_1.deepClone)(options);
        }
        return this.confOptions;
    }
    /**
     * Slugify
     * @param str
     * @param options
     */
    slugify(str, options) {
        options = typeof options === 'object' ? options : {};
        const opt = (0, utils_1.deepClone)(Object.assign(Object.assign({}, this.options), options));
        // remove leading and trailing separators
        const sep = opt.separator ? (0, utils_1.escapeRegExp)(opt.separator) : '';
        let slug = this.transliterate(str, opt);
        slug = (0, utils_1.regexpReplaceCustom)(slug, RegExp(`[^${opt.allowedChars}]+`, 'g'), opt.separator, opt.ignore);
        if (sep) {
            slug = slug.replace(RegExp(`^${sep}+|${sep}$`, 'g'), '');
        }
        if (opt.lowercase) {
            slug = slug.toLowerCase();
        }
        if (opt.uppercase) {
            slug = slug.toUpperCase();
        }
        return slug;
    }
}
exports.Slugify = Slugify;
