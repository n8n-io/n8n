"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Transliterate = exports.defaultOptions = void 0;
const charmap_1 = require("../../data/charmap");
const utils_1 = require("./utils");
exports.defaultOptions = {
    ignore: [],
    replace: [],
    replaceAfter: [],
    trim: false,
    unknown: '',
    fixChineseSpacing: true,
};
class Transliterate {
    constructor(confOptions = (0, utils_1.deepClone)(exports.defaultOptions), map = charmap_1.charmap) {
        this.confOptions = confOptions;
        this.map = map;
    }
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
     * Replace the source string using the code map
     * @param str
     * @param ignoreRanges
     * @param unknown
     */
    codeMapReplace(str, ignoreRanges = [], opt) {
        let index = 0;
        let result = '';
        const strContainsChinese = opt.fixChineseSpacing && (0, utils_1.hasChinese)(str);
        let lastCharHasChinese = false;
        for (let i = 0; i < str.length; i++) {
            // Get current character, taking surrogates in consideration
            const char = /[\uD800-\uDBFF]/.test(str[i]) && /[\uDC00-\uDFFF]/.test(str[i + 1])
                ? str[i] + str[i + 1]
                : str[i];
            let s;
            let ignoreFixingChinese = false;
            switch (true) {
                // current character is in ignored list
                case (0, utils_1.inRange)(index, ignoreRanges):
                // could be UTF-32 with high and low surrogates
                case char.length === 2 && (0, utils_1.inRange)(index + 1, ignoreRanges):
                    s = char;
                    // if it's the first character of an ignored string, then leave ignoreFixingChinese to true
                    if (!ignoreRanges.find((range) => range[1] >= index && range[0] === index)) {
                        ignoreFixingChinese = true;
                    }
                    break;
                default:
                    s = this.map[char] || opt.unknown || '';
            }
            // fix Chinese spacing issue
            if (strContainsChinese) {
                if (lastCharHasChinese &&
                    !ignoreFixingChinese &&
                    !(0, utils_1.hasPunctuationOrSpace)(s)) {
                    s = ' ' + s;
                }
                lastCharHasChinese = !!s && (0, utils_1.hasChinese)(char);
            }
            result += s;
            index += char.length;
            // If it's UTF-32 then skip next character
            i += char.length - 1;
        }
        return result;
    }
    /**
     * Convert the object version of the 'replace' option into tuple array one
     * @param option replace option to be either an object or tuple array
     * @return return the paired array version of replace option
     */
    formatReplaceOption(option) {
        if (option instanceof Array) {
            // return a new copy of the array
            return (0, utils_1.deepClone)(option);
        }
        // convert object option to array one
        const replaceArr = [];
        for (const key in option) {
            /* istanbul ignore else */
            if (Object.prototype.hasOwnProperty.call(option, key)) {
                replaceArr.push([key, option[key]]);
            }
        }
        return replaceArr;
    }
    /**
     * Search and replace a list of strings(regexps) and return the result string
     * @param source Source string
     * @param searches Search-replace string(regexp) pairs
     */
    replaceString(source, searches, ignore = []) {
        const clonedSearches = (0, utils_1.deepClone)(searches);
        let result = source;
        for (let i = 0; i < clonedSearches.length; i++) {
            const item = clonedSearches[i];
            switch (true) {
                case item[0] instanceof RegExp:
                    item[0] = RegExp(item[0].source, `${item[0].flags.replace('g', '')}g`);
                    break;
                case typeof item[0] === 'string' && item[0].length > 0:
                    item[0] = RegExp((0, utils_1.escapeRegExp)(item[0]), 'g');
                    break;
                default:
                    item[0] = /[^\s\S]/; // Prevent ReDos attack
            }
            result = (0, utils_1.regexpReplaceCustom)(result, item[0], item[1], ignore);
        }
        return result;
    }
    /**
     * Set charmap data
     * @param {Charmap} [data]
     * @param {boolean} [reset=false]
     * @memberof Transliterate
     */
    setData(data, reset = false) {
        if (reset) {
            this.map = (0, utils_1.deepClone)(charmap_1.charmap);
        }
        if (data && typeof data === 'object' && Object.keys(data).length) {
            this.map = (0, utils_1.deepClone)(this.map);
            for (const from in data) {
                /* istanbul ignore else */
                if (Object.prototype.hasOwnProperty.call(data, from) &&
                    from.length < 3 &&
                    from <= '\udbff\udfff') {
                    this.map[from] = data[from];
                }
            }
        }
        return this.map;
    }
    /**
     * Main transliterate function
     * @param source The string which is being transliterated
     * @param options Options object
     */
    transliterate(source, options) {
        options = typeof options === 'object' ? options : {};
        const opt = (0, utils_1.deepClone)(Object.assign(Object.assign({}, this.options), options));
        // force convert to string
        let str = typeof source === 'string' ? source : String(source);
        const replaceOption = this.formatReplaceOption(opt.replace);
        if (replaceOption.length) {
            str = this.replaceString(str, replaceOption, opt.ignore);
        }
        // ignore
        const ignoreRanges = opt.ignore && opt.ignore.length > 0
            ? (0, utils_1.findStrOccurrences)(str, opt.ignore)
            : [];
        str = this.codeMapReplace(str, ignoreRanges, opt);
        // trim spaces at the beginning and ending of the string
        if (opt.trim) {
            str = str.trim();
        }
        const replaceAfterOption = this.formatReplaceOption(opt.replaceAfter);
        if (replaceAfterOption.length) {
            str = this.replaceString(str, replaceAfterOption);
        }
        return str;
    }
}
exports.Transliterate = Transliterate;
