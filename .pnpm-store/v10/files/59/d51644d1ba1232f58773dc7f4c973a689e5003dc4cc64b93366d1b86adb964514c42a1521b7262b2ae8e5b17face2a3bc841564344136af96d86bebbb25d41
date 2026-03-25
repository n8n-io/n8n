"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.replaceRange = exports.replaceSourceRange = exports.replaceAll = exports.replace = exports.create = exports.toString = exports.getLength = void 0;
const binarySearch_1 = require("./binarySearch");
const track_1 = require("./track");
__exportStar(require("./types"), exports);
__exportStar(require("./track"), exports);
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
function create(source) {
    return [[source, undefined, 0]];
}
exports.create = create;
function replace(segments, pattern, ...replacers) {
    const str = toString(segments);
    const match = str.match(pattern);
    if (match && match.index !== undefined) {
        const startOffset = match.index;
        const endOffset = startOffset + match[0].length;
        (0, track_1.offsetStack)();
        replaceRange(segments, startOffset, endOffset, ...replacers.map(replacer => typeof replacer === 'function' ? replacer(match[0]) : replacer));
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
            const startOffset = match.index + lengthDiff;
            const endOffset = startOffset + match[0].length;
            (0, track_1.offsetStack)();
            replaceRange(segments, startOffset, endOffset, ...replacers.map(replacer => typeof replacer === 'function' ? replacer(match[0]) : replacer));
            (0, track_1.resetOffsetStack)();
            const newLength = getLength(segments);
            lengthDiff += newLength - length;
            length = newLength;
        }
    }
}
exports.replaceAll = replaceAll;
function replaceSourceRange(segments, source, startOffset, endOffset, ...newSegments) {
    for (const segment of segments) {
        if (typeof segment === 'string') {
            continue;
        }
        if (segment[1] === source) {
            const segmentStart = segment[2];
            const segmentEnd = segment[2] + segment[0].length;
            if (segmentStart <= startOffset && segmentEnd >= endOffset) {
                const inserts = [];
                if (startOffset > segmentStart) {
                    inserts.push(trimSegmentEnd(segment, startOffset - segmentStart));
                }
                for (const newSegment of newSegments) {
                    inserts.push(newSegment);
                }
                if (endOffset < segmentEnd) {
                    inserts.push(trimSegmentStart(segment, endOffset - segmentEnd));
                }
                combineStrings(inserts);
                (0, track_1.offsetStack)();
                segments.splice(segments.indexOf(segment), 1, ...inserts);
                (0, track_1.resetOffsetStack)();
                return true;
            }
        }
    }
    return false;
}
exports.replaceSourceRange = replaceSourceRange;
function replaceRange(segments, startOffset, endOffset, ...newSegments) {
    const offsets = toOffsets(segments);
    const startIndex = (0, binarySearch_1.binarySearch)(offsets, startOffset);
    const endIndex = (0, binarySearch_1.binarySearch)(offsets, endOffset);
    const startSegment = segments[startIndex];
    const endSegment = segments[endIndex];
    const startSegmentStart = offsets[startIndex];
    const endSegmentStart = offsets[endIndex];
    const endSegmentEnd = offsets[endIndex] + (typeof endSegment === 'string' ? endSegment.length : endSegment[0].length);
    const inserts = [];
    if (startOffset > startSegmentStart) {
        inserts.push(trimSegmentEnd(startSegment, startOffset - startSegmentStart));
    }
    for (const newSegment of newSegments) {
        inserts.push(newSegment);
    }
    if (endOffset < endSegmentEnd) {
        inserts.push(trimSegmentStart(endSegment, endOffset - endSegmentStart));
    }
    combineStrings(inserts);
    (0, track_1.offsetStack)();
    segments.splice(startIndex, endIndex - startIndex + 1, ...inserts);
    (0, track_1.resetOffsetStack)();
}
exports.replaceRange = replaceRange;
function combineStrings(segments) {
    for (let i = segments.length - 1; i >= 1; i--) {
        if (typeof segments[i] === 'string' && typeof segments[i - 1] === 'string') {
            segments[i - 1] = segments[i - 1] + segments[i];
            (0, track_1.offsetStack)();
            segments.splice(i, 1);
            (0, track_1.resetOffsetStack)();
        }
    }
}
function trimSegmentEnd(segment, trimEnd) {
    if (typeof segment === 'string') {
        return segment.slice(0, trimEnd);
    }
    return [
        segment[0].slice(0, trimEnd),
        ...segment.slice(1),
    ];
}
function trimSegmentStart(segment, trimStart) {
    if (typeof segment === 'string') {
        return segment.slice(trimStart);
    }
    if (trimStart < 0) {
        trimStart += segment[0].length;
    }
    return [
        segment[0].slice(trimStart),
        segment[1],
        segment[2] + trimStart,
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
//# sourceMappingURL=index.js.map