import { stripAnsi } from "../strip-ansi/index.js";
import { eastAsianWidth } from "../eastasianwidth/index.js";
import { emojiRegex } from "../emoji-regex/index.js";
export function stringWidth(str, options = {}) {
    if (typeof str !== "string" || str.length === 0) {
        return 0;
    }
    options = {
        ambiguousIsNarrow: true,
        ...options,
    };
    str = stripAnsi(str);
    if (str.length === 0) {
        return 0;
    }
    str = str.replace(emojiRegex(), "  ");
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
        const code = eastAsianWidth(character);
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