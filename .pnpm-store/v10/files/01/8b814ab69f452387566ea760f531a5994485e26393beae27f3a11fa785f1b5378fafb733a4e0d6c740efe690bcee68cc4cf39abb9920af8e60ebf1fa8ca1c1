"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringWidth = stringWidth;
const index_js_1 = require("../strip-ansi/index.js");
const index_js_2 = require("../eastasianwidth/index.js");
const index_js_3 = require("../emoji-regex/index.js");
function stringWidth(str, options = {}) {
    if (typeof str !== "string" || str.length === 0) {
        return 0;
    }
    options = {
        ambiguousIsNarrow: true,
        ...options,
    };
    str = (0, index_js_1.stripAnsi)(str);
    if (str.length === 0) {
        return 0;
    }
    str = str.replace((0, index_js_3.emojiRegex)(), "  ");
    const ambiguousCharacterWidth = options.ambiguousIsNarrow ? 1 : 2;
    let width = 0;
    for (const character of str) {
        const codePoint = character.codePointAt(0);
        // Ignore control characters
        if (!codePoint ||
            codePoint <= 0x1f ||
            (codePoint >= 0x7f && codePoint <= 0x9f)) {
            continue;
        }
        // Ignore combining characters
        if (codePoint >= 0x300 && codePoint <= 0x36f) {
            continue;
        }
        const code = (0, index_js_2.eastAsianWidth)(character);
        switch (code) {
            case "F":
            case "W":
                width += 2;
                break;
            case "A":
                width += ambiguousCharacterWidth;
                break;
            default:
                width += 1;
        }
    }
    return width;
}
//# sourceMappingURL=index.js.map