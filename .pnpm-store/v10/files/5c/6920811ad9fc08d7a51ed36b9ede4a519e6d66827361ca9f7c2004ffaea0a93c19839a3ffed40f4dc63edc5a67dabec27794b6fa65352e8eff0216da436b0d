"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.overwrite = exports.replaceAll = exports.replace = exports.toString = exports.getLength = void 0;
const binarySearch_1 = require("./binarySearch");
const track_1 = require("./track");
function getLength(segments) {
    let length = 0;
    for (const segment of segments) {
        length += typeof segment == 'string' ? segment.length : segment[0].length;
    }
    return length;
}
exports.getLength = getLength;
function toString(segments) {
    return segments.map(s => typeof s === 'string' ? s : s[0]).join('');
}
exports.toString = toString;
function replace(segments, pattern, ...replacers) {
    const str = toString(segments);
    const match = str.match(pattern);
    if (match && match.index !== undefined) {
        const start = match.index;
        const end = start + match[0].length;
        (0, track_1.offsetStack)();
        overwrite(segments, [start, end], ...replacers.map(replacer => typeof replacer === 'function' ? replacer(match[0]) : replacer));
        (0, track_1.resetOffsetStack)();
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
            (0, track_1.offsetStack)();
            overwrite(segments, [start, end], ...replacers.map(replacer => typeof replacer === 'function' ? replacer(match[0]) : replacer));
            (0, track_1.resetOffsetStack)();
            const newLength = getLength(segments);
            lengthDiff += newLength - length;
            length = newLength;
        }
    }
}
exports.replaceAll = replaceAll;
function overwrite(segments, range, ...inserts) {
    const offsets = toOffsets(segments);
    const [start, end] = typeof range === 'number' ? [range, range] : range;
    const startIndex = (0, binarySearch_1.binarySearch)(offsets, start);
    const endIndex = (0, binarySearch_1.binarySearch)(offsets, end);
    const startSegment = segments[startIndex];
    const endSegment = segments[endIndex];
    const startSegmentStart = offsets[startIndex];
    const endSegmentStart = offsets[endIndex];
    const endSegmentEnd = offsets[endIndex] + (typeof endSegment === 'string' ? endSegment.length : endSegment[0].length);
    if (start > startSegmentStart) {
        inserts.unshift(trimSegmentEnd(startSegment, start - startSegmentStart));
    }
    if (end < endSegmentEnd) {
        inserts.push(trimSegmentStart(endSegment, end - endSegmentStart));
    }
    (0, track_1.offsetStack)();
    const deleted = segments.splice(startIndex, endIndex - startIndex + 1, ...inserts);
    (0, track_1.resetOffsetStack)();
    if (end < endSegmentEnd) {
        deleted[deleted.length - 1] = trimSegmentEnd(deleted[deleted.length - 1], end - endSegmentStart);
    }
    if (start > startSegmentStart) {
        deleted[0] = trimSegmentStart(deleted[0], start - startSegmentStart);
    }
    return deleted;
}
exports.overwrite = overwrite;
function trimSegmentEnd(segment, trimEnd) {
    if (typeof segment === 'string') {
        return segment.slice(0, trimEnd);
    }
    const originalString = segment[0];
    const originalRange = segment[2];
    const newString = originalString.slice(0, trimEnd);
    const newRange = typeof originalRange === 'number' ? originalRange : [originalRange[0], originalRange[1] - (originalString.length - newString.length)];
    return [
        newString,
        segment[1],
        newRange,
        ...segment.slice(3),
    ];
}
function trimSegmentStart(segment, trimStart) {
    if (typeof segment === 'string') {
        return segment.slice(trimStart);
    }
    const originalString = segment[0];
    const originalRange = segment[2];
    const newString = originalString.slice(trimStart);
    if (trimStart < 0) {
        trimStart += originalString.length;
    }
    const newRange = typeof originalRange === 'number' ? originalRange + trimStart : [originalRange[0] + trimStart, originalRange[1]];
    return [
        newString,
        segment[1],
        newRange,
        ...segment.slice(3),
    ];
}
function toOffsets(segments) {
    const offsets = [];
    let offset = 0;
    for (const segment of segments) {
        offsets.push(offset);
        offset += typeof segment == 'string' ? segment.length : segment[0].length;
    }
    return offsets;
}
//# sourceMappingURL=base.js.map