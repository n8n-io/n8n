"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.replaceAll = exports.replace = void 0;
function replace(segments, pattern, ...replacers) {
    const str = toString(segments);
    const match = str.match(pattern);
    if (match && match.index !== undefined) {
        const start = match.index;
        const end = start + match[0].length;
        offsetStack();
        overwrite(segments, [start, end], ...replacers.map(replacer => typeof replacer === 'function' ? replacer(match[0]) : replacer));
        resetOffsetStack();
    }
}
exports.replace = replace;
function replaceAll(segments, pattern, ...replacers) {
    const str = toString(segments);
    const allMatch = str.matchAll(pattern);
    let length = str.length;
    let lengthDiff = 0;
    for (const match of allMatch) {
        if (match.index !== undefined) {
            const start = match.index + lengthDiff;
            const end = start + match[0].length;
            offsetStack();
            overwrite(segments, [start, end], ...replacers.map(replacer => typeof replacer === 'function' ? replacer(match[0]) : replacer));
            resetOffsetStack();
            const newLength = getLength(segments);
            lengthDiff += newLength - length;
            length = newLength;
        }
    }
}
exports.replaceAll = replaceAll;
//# sourceMappingURL=replace.js.map