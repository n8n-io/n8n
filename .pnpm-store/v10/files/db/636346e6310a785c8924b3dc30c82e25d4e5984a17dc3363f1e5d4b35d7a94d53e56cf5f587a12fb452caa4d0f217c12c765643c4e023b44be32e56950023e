"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const non_spacing_chars_1 = __importDefault(require("./non-spacing-chars"));
const binary_search_1 = __importDefault(require("./binary-search"));
/* The following two functions define the column width of an ISO 10646
 * character as follows:
 *
 *    - The null character (U+0000) has a column width of 0.
 *
 *    - Other C0/C1 control characters and DEL will lead to a return
 *      value of -1.
 *
 *    - Non-spacing and enclosing combining characters (general
 *      category code Mn or Me in the Unicode database) have a
 *      column width of 0.
 *
 *    - SOFT HYPHEN (U+00AD) has a column width of 1.
 *
 *    - Other format characters (general category code Cf in the Unicode
 *      database) and ZERO WIDTH SPACE (U+200B) have a column width of 0.
 *
 *    - Hangul Jamo medial vowels and final consonants (U+1160-U+11FF)
 *      have a column width of 0.
 *
 *    - Spacing characters in the East Asian Wide (W) or East Asian
 *      Full-width (F) category as defined in Unicode Technical
 *      Report #11 have a column width of 2.
 *
 *    - All remaining characters (including all printable
 *      ISO 8859-1 and WGL4 characters, Unicode control characters,
 *      etc.) have a column width of 1.
 *
 * This implementation assumes that wchar_t characters are encoded
 * in ISO 10646.
 */
const mk_wcwidth = (ucs) => {
    /* test for 8-bit control characters */
    if (ucs === 0) {
        return 0;
    }
    if (ucs < 32 || (ucs >= 0x7f && ucs < 0xa0)) {
        return -1;
    }
    /* binary search in table of non-spacing characters */
    if (binary_search_1.default(ucs, non_spacing_chars_1.default, non_spacing_chars_1.default.length - 1)) {
        return 0;
    }
    /* if we arrive here, ucs is not a combining or C0/C1 control character */
    return (1 +
        Number(ucs >= 0x1100 &&
            (ucs <= 0x115f /* Hangul Jamo init. consonants */ ||
                ucs === 0x2329 ||
                ucs === 0x232a ||
                (ucs >= 0x2e80 && ucs <= 0xa4cf && ucs !== 0x303f) /* CJK ... Yi */ ||
                (ucs >= 0xac00 && ucs <= 0xd7a3) /* Hangul Syllables */ ||
                (ucs >= 0xf900 && ucs <= 0xfaff) /* CJK Compatibility Ideographs */ ||
                (ucs >= 0xfe10 && ucs <= 0xfe19) /* Vertical forms */ ||
                (ucs >= 0xfe30 && ucs <= 0xfe6f) /* CJK Compatibility Forms */ ||
                (ucs >= 0xff00 && ucs <= 0xff60) /* Fullwidth Forms */ ||
                (ucs >= 0xffe0 && ucs <= 0xffe6) ||
                (ucs >= 0x20000 && ucs <= 0x2fffd) ||
                (ucs >= 0x30000 && ucs <= 0x3fffd))));
};
exports.default = mk_wcwidth;
