export const eastAsianWidth = (character) => {
    var x = character.charCodeAt(0);
    var y = character.length == 2 ? character.charCodeAt(1) : 0;
    var codePoint = x;
    if (0xd800 <= x && x <= 0xdbff && 0xdc00 <= y && y <= 0xdfff) {
        x &= 0x3ff;
        y &= 0x3ff;
        codePoint = (x << 10) | y;
        codePoint += 0x10000;
    }
    if (0x3000 == codePoint ||
        (0xff01 <= codePoint && codePoint <= 0xff60) ||
        (0xffe0 <= codePoint && codePoint <= 0xffe6)) {
        return "F";
    }
    if (0x20a9 == codePoint ||
        (0xff61 <= codePoint && codePoint <= 0xffbe) ||
        (0xffc2 <= codePoint && codePoint <= 0xffc7) ||
        (0xffca <= codePoint && codePoint <= 0xffcf) ||
        (0xffd2 <= codePoint && codePoint <= 0xffd7) ||
        (0xffda <= codePoint && codePoint <= 0xffdc) ||
        (0xffe8 <= codePoint && codePoint <= 0xffee)) {
        return "H";
    }
    if ((0x1100 <= codePoint && codePoint <= 0x115f) ||
        (0x11a3 <= codePoint && codePoint <= 0x11a7) ||
        (0x11fa <= codePoint && codePoint <= 0x11ff) ||
        (0x2329 <= codePoint && codePoint <= 0x232a) ||
        (0x2e80 <= codePoint && codePoint <= 0x2e99) ||
        (0x2e9b <= codePoint && codePoint <= 0x2ef3) ||
        (0x2f00 <= codePoint && codePoint <= 0x2fd5) ||
        (0x2ff0 <= codePoint && codePoint <= 0x2ffb) ||
        (0x3001 <= codePoint && codePoint <= 0x303e) ||
        (0x3041 <= codePoint && codePoint <= 0x3096) ||
        (0x3099 <= codePoint && codePoint <= 0x30ff) ||
        (0x3105 <= codePoint && codePoint <= 0x312d) ||
        (0x3131 <= codePoint && codePoint <= 0x318e) ||
        (0x3190 <= codePoint && codePoint <= 0x31ba) ||
        (0x31c0 <= codePoint && codePoint <= 0x31e3) ||
        (0x31f0 <= codePoint && codePoint <= 0x321e) ||
        (0x3220 <= codePoint && codePoint <= 0x3247) ||
        (0x3250 <= codePoint && codePoint <= 0x32fe) ||
        (0x3300 <= codePoint && codePoint <= 0x4dbf) ||
        (0x4e00 <= codePoint && codePoint <= 0xa48c) ||
        (0xa490 <= codePoint && codePoint <= 0xa4c6) ||
        (0xa960 <= codePoint && codePoint <= 0xa97c) ||
        (0xac00 <= codePoint && codePoint <= 0xd7a3) ||
        (0xd7b0 <= codePoint && codePoint <= 0xd7c6) ||
        (0xd7cb <= codePoint && codePoint <= 0xd7fb) ||
        (0xf900 <= codePoint && codePoint <= 0xfaff) ||
        (0xfe10 <= codePoint && codePoint <= 0xfe19) ||
        (0xfe30 <= codePoint && codePoint <= 0xfe52) ||
        (0xfe54 <= codePoint && codePoint <= 0xfe66) ||
        (0xfe68 <= codePoint && codePoint <= 0xfe6b) ||
        (0x1b000 <= codePoint && codePoint <= 0x1b001) ||
        (0x1f200 <= codePoint && codePoint <= 0x1f202) ||
        (0x1f210 <= codePoint && codePoint <= 0x1f23a) ||
        (0x1f240 <= codePoint && codePoint <= 0x1f248) ||
        (0x1f250 <= codePoint && codePoint <= 0x1f251) ||
        (0x20000 <= codePoint && codePoint <= 0x2f73f) ||
        (0x2b740 <= codePoint && codePoint <= 0x2fffd) ||
        (0x30000 <= codePoint && codePoint <= 0x3fffd)) {
        return "W";
    }
    if ((0x0020 <= codePoint && codePoint <= 0x007e) ||
        (0x00a2 <= codePoint && codePoint <= 0x00a3) ||
        (0x00a5 <= codePoint && codePoint <= 0x00a6) ||
        0x00ac == codePoint ||
        0x00af == codePoint ||
        (0x27e6 <= codePoint && codePoint <= 0x27ed) ||
        (0x2985 <= codePoint && codePoint <= 0x2986)) {
        return "Na";
    }
    if (0x00a1 == codePoint ||
        0x00a4 == codePoint ||
        (0x00a7 <= codePoint && codePoint <= 0x00a8) ||
        0x00aa == codePoint ||
        (0x00ad <= codePoint && codePoint <= 0x00ae) ||
        (0x00b0 <= codePoint && codePoint <= 0x00b4) ||
        (0x00b6 <= codePoint && codePoint <= 0x00ba) ||
        (0x00bc <= codePoint && codePoint <= 0x00bf) ||
        0x00c6 == codePoint ||
        0x00d0 == codePoint ||
        (0x00d7 <= codePoint && codePoint <= 0x00d8) ||
        (0x00de <= codePoint && codePoint <= 0x00e1) ||
        0x00e6 == codePoint ||
        (0x00e8 <= codePoint && codePoint <= 0x00ea) ||
        (0x00ec <= codePoint && codePoint <= 0x00ed) ||
        0x00f0 == codePoint ||
        (0x00f2 <= codePoint && codePoint <= 0x00f3) ||
        (0x00f7 <= codePoint && codePoint <= 0x00fa) ||
        0x00fc == codePoint ||
        0x00fe == codePoint ||
        0x0101 == codePoint ||
        0x0111 == codePoint ||
        0x0113 == codePoint ||
        0x011b == codePoint ||
        (0x0126 <= codePoint && codePoint <= 0x0127) ||
        0x012b == codePoint ||
        (0x0131 <= codePoint && codePoint <= 0x0133) ||
        0x0138 == codePoint ||
        (0x013f <= codePoint && codePoint <= 0x0142) ||
        0x0144 == codePoint ||
        (0x0148 <= codePoint && codePoint <= 0x014b) ||
        0x014d == codePoint ||
        (0x0152 <= codePoint && codePoint <= 0x0153) ||
        (0x0166 <= codePoint && codePoint <= 0x0167) ||
        0x016b == codePoint ||
        0x01ce == codePoint ||
        0x01d0 == codePoint ||
        0x01d2 == codePoint ||
        0x01d4 == codePoint ||
        0x01d6 == codePoint ||
        0x01d8 == codePoint ||
        0x01da == codePoint ||
        0x01dc == codePoint ||
        0x0251 == codePoint ||
        0x0261 == codePoint ||
        0x02c4 == codePoint ||
        0x02c7 == codePoint ||
        (0x02c9 <= codePoint && codePoint <= 0x02cb) ||
        0x02cd == codePoint ||
        0x02d0 == codePoint ||
        (0x02d8 <= codePoint && codePoint <= 0x02db) ||
        0x02dd == codePoint ||
        0x02df == codePoint ||
        (0x0300 <= codePoint && codePoint <= 0x036f) ||
        (0x0391 <= codePoint && codePoint <= 0x03a1) ||
        (0x03a3 <= codePoint && codePoint <= 0x03a9) ||
        (0x03b1 <= codePoint && codePoint <= 0x03c1) ||
        (0x03c3 <= codePoint && codePoint <= 0x03c9) ||
        0x0401 == codePoint ||
        (0x0410 <= codePoint && codePoint <= 0x044f) ||
        0x0451 == codePoint ||
        0x2010 == codePoint ||
        (0x2013 <= codePoint && codePoint <= 0x2016) ||
        (0x2018 <= codePoint && codePoint <= 0x2019) ||
        (0x201c <= codePoint && codePoint <= 0x201d) ||
        (0x2020 <= codePoint && codePoint <= 0x2022) ||
        (0x2024 <= codePoint && codePoint <= 0x2027) ||
        0x2030 == codePoint ||
        (0x2032 <= codePoint && codePoint <= 0x2033) ||
        0x2035 == codePoint ||
        0x203b == codePoint ||
        0x203e == codePoint ||
        0x2074 == codePoint ||
        0x207f == codePoint ||
        (0x2081 <= codePoint && codePoint <= 0x2084) ||
        0x20ac == codePoint ||
        0x2103 == codePoint ||
        0x2105 == codePoint ||
        0x2109 == codePoint ||
        0x2113 == codePoint ||
        0x2116 == codePoint ||
        (0x2121 <= codePoint && codePoint <= 0x2122) ||
        0x2126 == codePoint ||
        0x212b == codePoint ||
        (0x2153 <= codePoint && codePoint <= 0x2154) ||
        (0x215b <= codePoint && codePoint <= 0x215e) ||
        (0x2160 <= codePoint && codePoint <= 0x216b) ||
        (0x2170 <= codePoint && codePoint <= 0x2179) ||
        0x2189 == codePoint ||
        (0x2190 <= codePoint && codePoint <= 0x2199) ||
        (0x21b8 <= codePoint && codePoint <= 0x21b9) ||
        0x21d2 == codePoint ||
        0x21d4 == codePoint ||
        0x21e7 == codePoint ||
        0x2200 == codePoint ||
        (0x2202 <= codePoint && codePoint <= 0x2203) ||
        (0x2207 <= codePoint && codePoint <= 0x2208) ||
        0x220b == codePoint ||
        0x220f == codePoint ||
        0x2211 == codePoint ||
        0x2215 == codePoint ||
        0x221a == codePoint ||
        (0x221d <= codePoint && codePoint <= 0x2220) ||
        0x2223 == codePoint ||
        0x2225 == codePoint ||
        (0x2227 <= codePoint && codePoint <= 0x222c) ||
        0x222e == codePoint ||
        (0x2234 <= codePoint && codePoint <= 0x2237) ||
        (0x223c <= codePoint && codePoint <= 0x223d) ||
        0x2248 == codePoint ||
        0x224c == codePoint ||
        0x2252 == codePoint ||
        (0x2260 <= codePoint && codePoint <= 0x2261) ||
        (0x2264 <= codePoint && codePoint <= 0x2267) ||
        (0x226a <= codePoint && codePoint <= 0x226b) ||
        (0x226e <= codePoint && codePoint <= 0x226f) ||
        (0x2282 <= codePoint && codePoint <= 0x2283) ||
        (0x2286 <= codePoint && codePoint <= 0x2287) ||
        0x2295 == codePoint ||
        0x2299 == codePoint ||
        0x22a5 == codePoint ||
        0x22bf == codePoint ||
        0x2312 == codePoint ||
        (0x2460 <= codePoint && codePoint <= 0x24e9) ||
        (0x24eb <= codePoint && codePoint <= 0x254b) ||
        (0x2550 <= codePoint && codePoint <= 0x2573) ||
        (0x2580 <= codePoint && codePoint <= 0x258f) ||
        (0x2592 <= codePoint && codePoint <= 0x2595) ||
        (0x25a0 <= codePoint && codePoint <= 0x25a1) ||
        (0x25a3 <= codePoint && codePoint <= 0x25a9) ||
        (0x25b2 <= codePoint && codePoint <= 0x25b3) ||
        (0x25b6 <= codePoint && codePoint <= 0x25b7) ||
        (0x25bc <= codePoint && codePoint <= 0x25bd) ||
        (0x25c0 <= codePoint && codePoint <= 0x25c1) ||
        (0x25c6 <= codePoint && codePoint <= 0x25c8) ||
        0x25cb == codePoint ||
        (0x25ce <= codePoint && codePoint <= 0x25d1) ||
        (0x25e2 <= codePoint && codePoint <= 0x25e5) ||
        0x25ef == codePoint ||
        (0x2605 <= codePoint && codePoint <= 0x2606) ||
        0x2609 == codePoint ||
        (0x260e <= codePoint && codePoint <= 0x260f) ||
        (0x2614 <= codePoint && codePoint <= 0x2615) ||
        0x261c == codePoint ||
        0x261e == codePoint ||
        0x2640 == codePoint ||
        0x2642 == codePoint ||
        (0x2660 <= codePoint && codePoint <= 0x2661) ||
        (0x2663 <= codePoint && codePoint <= 0x2665) ||
        (0x2667 <= codePoint && codePoint <= 0x266a) ||
        (0x266c <= codePoint && codePoint <= 0x266d) ||
        0x266f == codePoint ||
        (0x269e <= codePoint && codePoint <= 0x269f) ||
        (0x26be <= codePoint && codePoint <= 0x26bf) ||
        (0x26c4 <= codePoint && codePoint <= 0x26cd) ||
        (0x26cf <= codePoint && codePoint <= 0x26e1) ||
        0x26e3 == codePoint ||
        (0x26e8 <= codePoint && codePoint <= 0x26ff) ||
        0x273d == codePoint ||
        0x2757 == codePoint ||
        (0x2776 <= codePoint && codePoint <= 0x277f) ||
        (0x2b55 <= codePoint && codePoint <= 0x2b59) ||
        (0x3248 <= codePoint && codePoint <= 0x324f) ||
        (0xe000 <= codePoint && codePoint <= 0xf8ff) ||
        (0xfe00 <= codePoint && codePoint <= 0xfe0f) ||
        0xfffd == codePoint ||
        (0x1f100 <= codePoint && codePoint <= 0x1f10a) ||
        (0x1f110 <= codePoint && codePoint <= 0x1f12d) ||
        (0x1f130 <= codePoint && codePoint <= 0x1f169) ||
        (0x1f170 <= codePoint && codePoint <= 0x1f19a) ||
        (0xe0100 <= codePoint && codePoint <= 0xe01ef) ||
        (0xf0000 <= codePoint && codePoint <= 0xffffd) ||
        (0x100000 <= codePoint && codePoint <= 0x10fffd)) {
        return "A";
    }
    return "N";
};
export const characterLength = (character) => {
    var code = eastAsianWidth(character);
    if (code == "F" || code == "W" || code == "A") {
        return 2;
    }
    else {
        return 1;
    }
};
// Split a string considering surrogate-pairs.
export const stringToArray = (str) => {
    return str.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[^\uD800-\uDFFF]/g) || [];
};
export const length = (str) => {
    var characters = stringToArray(str);
    var len = 0;
    for (const char of characters) {
        len = len + characterLength(char);
    }
    return len;
};
export const slice = (text, start, end) => {
    const textLen = length(text);
    start = start ? start : 0;
    end = end ? end : 1;
    if (start < 0) {
        start = textLen + start;
    }
    if (end < 0) {
        end = textLen + end;
    }
    var result = "";
    var eawLen = 0;
    var chars = stringToArray(text);
    for (const char of chars) {
        var charLen = length(char);
        if (eawLen >= start - (charLen == 2 ? 1 : 0)) {
            if (eawLen + charLen <= end) {
                result += char;
            }
            else {
                break;
            }
        }
        eawLen += charLen;
    }
    return result;
};
//# sourceMappingURL=index.js.map