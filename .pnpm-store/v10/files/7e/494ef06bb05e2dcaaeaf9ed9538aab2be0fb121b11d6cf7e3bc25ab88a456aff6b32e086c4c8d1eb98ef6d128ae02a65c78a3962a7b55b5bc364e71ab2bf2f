"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SourceMap = void 0;
const binarySearch_1 = require("./binarySearch");
const translateOffset_1 = require("./translateOffset");
class SourceMap {
    constructor(mappings) {
        this.mappings = mappings;
    }
    toSourceRange(generatedStart, generatedEnd, fallbackToAnyMatch, filter) {
        return this.findMatchingStartEnd(generatedStart, generatedEnd, fallbackToAnyMatch, 'generatedOffsets', filter);
    }
    toGeneratedRange(sourceStart, sourceEnd, fallbackToAnyMatch, filter) {
        return this.findMatchingStartEnd(sourceStart, sourceEnd, fallbackToAnyMatch, 'sourceOffsets', filter);
    }
    toSourceLocation(generatedOffset, filter) {
        return this.findMatchingOffsets(generatedOffset, 'generatedOffsets', filter);
    }
    toGeneratedLocation(sourceOffset, filter) {
        return this.findMatchingOffsets(sourceOffset, 'sourceOffsets', filter);
    }
    *findMatchingOffsets(offset, fromRange, filter) {
        const memo = this.getMemoBasedOnRange(fromRange);
        if (memo.offsets.length === 0) {
            return;
        }
        const { low: start, high: end } = (0, binarySearch_1.binarySearch)(memo.offsets, offset);
        const skip = new Set();
        const toRange = fromRange == 'sourceOffsets' ? 'generatedOffsets' : 'sourceOffsets';
        for (let i = start; i <= end; i++) {
            for (const mapping of memo.mappings[i]) {
                if (skip.has(mapping)) {
                    continue;
                }
                skip.add(mapping);
                if (filter && !filter(mapping.data)) {
                    continue;
                }
                const mapped = (0, translateOffset_1.translateOffset)(offset, mapping[fromRange], mapping[toRange], getLengths(mapping, fromRange), getLengths(mapping, toRange));
                if (mapped !== undefined) {
                    yield [mapped, mapping];
                }
            }
        }
    }
    *findMatchingStartEnd(start, end, fallbackToAnyMatch, fromRange, filter) {
        const toRange = fromRange == 'sourceOffsets' ? 'generatedOffsets' : 'sourceOffsets';
        const mappedStarts = [];
        let hadMatch = false;
        for (const [mappedStart, mapping] of this.findMatchingOffsets(start, fromRange)) {
            if (filter && !filter(mapping.data)) {
                continue;
            }
            mappedStarts.push([mappedStart, mapping]);
            const mappedEnd = (0, translateOffset_1.translateOffset)(end, mapping[fromRange], mapping[toRange], getLengths(mapping, fromRange), getLengths(mapping, toRange));
            if (mappedEnd !== undefined) {
                hadMatch = true;
                yield [mappedStart, mappedEnd, mapping, mapping];
            }
        }
        if (!hadMatch && fallbackToAnyMatch) {
            for (const [mappedStart, mappingStart] of mappedStarts) {
                for (const [mappedEnd, mappingEnd] of this.findMatchingOffsets(end, fromRange)) {
                    if (filter && !filter(mappingEnd.data) || mappedEnd < mappedStart) {
                        continue;
                    }
                    yield [mappedStart, mappedEnd, mappingStart, mappingEnd];
                    break;
                }
                ;
            }
        }
    }
    getMemoBasedOnRange(fromRange) {
        return fromRange === 'sourceOffsets'
            ? this.sourceCodeOffsetsMemo ??= this.createMemo('sourceOffsets')
            : this.generatedCodeOffsetsMemo ??= this.createMemo('generatedOffsets');
    }
    createMemo(key) {
        const offsetsSet = new Set();
        for (const mapping of this.mappings) {
            for (let i = 0; i < mapping[key].length; i++) {
                offsetsSet.add(mapping[key][i]);
                offsetsSet.add(mapping[key][i] + getLengths(mapping, key)[i]);
            }
        }
        const offsets = [...offsetsSet].sort((a, b) => a - b);
        const mappings = offsets.map(() => new Set());
        for (const mapping of this.mappings) {
            for (let i = 0; i < mapping[key].length; i++) {
                const startIndex = (0, binarySearch_1.binarySearch)(offsets, mapping[key][i]).match;
                const endIndex = (0, binarySearch_1.binarySearch)(offsets, mapping[key][i] + getLengths(mapping, key)[i]).match;
                for (let i = startIndex; i <= endIndex; i++) {
                    mappings[i].add(mapping);
                }
            }
        }
        return { offsets, mappings };
    }
}
exports.SourceMap = SourceMap;
function getLengths(mapping, key) {
    return key == 'sourceOffsets' ? mapping.lengths : mapping.generatedLengths ?? mapping.lengths;
}
//# sourceMappingURL=sourceMap.js.map