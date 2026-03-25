"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.overwriteSource = void 0;
const base_1 = require("./base");
function overwriteSource(segments, ...args) {
    let loc;
    let newSegments;
    if (typeof args[0] === 'string') {
        const source = args[0];
        const sourceLoc = args[1];
        loc = typeof sourceLoc === 'number'
            ? searchSource(segments, source, sourceLoc)
            : [searchSource(segments, source, sourceLoc[0]), searchSource(segments, source, sourceLoc[1])];
        newSegments = args.slice(2);
    }
    else {
        const sourceLoc = args[0];
        loc = typeof sourceLoc === 'number'
            ? searchSource(segments, sourceLoc)
            : [searchSource(segments, sourceLoc[0]), searchSource(segments, sourceLoc[1])];
        newSegments = args.slice(1);
    }
    return (0, base_1.overwrite)(segments, loc, ...newSegments);
}
exports.overwriteSource = overwriteSource;
function searchSource(segments, ...args) {
    const source = args.length >= 2 ? args[0] : undefined;
    const sourceLoc = args.length >= 2 ? args[1] : args[0];
    let _offset = 0;
    let result;
    for (const segment of segments) {
        if (typeof segment === 'string') {
            _offset += segment.length;
            continue;
        }
        if (segment[1] === source) {
            const segmentStart = typeof segment[2] === 'number' ? segment[2] : segment[2][0];
            const segmentEnd = typeof segment[2] === 'number' ? segment[2] + segment[0].length : segment[2][1];
            if (sourceLoc >= segmentStart && sourceLoc <= segmentEnd) {
                result = _offset + (sourceLoc - segmentStart);
                break;
            }
        }
        _offset += segment[0].length;
    }
    if (result === undefined) {
        throw new Error(`Source index not found, source: ${source}, index: ${sourceLoc}`);
    }
    return result;
}
//# sourceMappingURL=overwriteSource.js.map