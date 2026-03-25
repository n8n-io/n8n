/*
 Copyright 2015, Yahoo Inc.
 Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
'use strict';

const pathutils = require('./pathutils');
const {
    originalPositionFor,
    allGeneratedPositionsFor,
    GREATEST_LOWER_BOUND,
    LEAST_UPPER_BOUND
} = require('@jridgewell/trace-mapping');

/**
 * AST ranges are inclusive for start positions and exclusive for end positions.
 * Source maps are also logically ranges over text, though interacting with
 * them is generally achieved by working with explicit positions.
 *
 * When finding the _end_ location of an AST item, the range behavior is
 * important because what we're asking for is the _end_ of whatever range
 * corresponds to the end location we seek.
 *
 * This boils down to the following steps, conceptually, though the source-map
 * library doesn't expose primitives to do this nicely:
 *
 * 1. Find the range on the generated file that ends at, or exclusively
 *    contains the end position of the AST node.
 * 2. Find the range on the original file that corresponds to
 *    that generated range.
 * 3. Find the _end_ location of that original range.
 */
function originalEndPositionFor(sourceMap, generatedEnd) {
    // Given the generated location, find the original location of the mapping
    // that corresponds to a range on the generated file that overlaps the
    // generated file end location. Note however that this position on its
    // own is not useful because it is the position of the _start_ of the range
    // on the original file, and we want the _end_ of the range.
    const beforeEndMapping = originalPositionTryBoth(
        sourceMap,
        generatedEnd.line,
        generatedEnd.column - 1
    );
    if (beforeEndMapping.source === null) {
        return null;
    }

    // Convert that original position back to a generated one, with a bump
    // to the right, and a rightward bias. Since 'generatedPositionFor' searches
    // for mappings in the original-order sorted list, this will find the
    // mapping that corresponds to the one immediately after the
    // beforeEndMapping mapping.
    const afterEndMappings = allGeneratedPositionsFor(sourceMap, {
        source: beforeEndMapping.source,
        line: beforeEndMapping.line,
        column: beforeEndMapping.column + 1,
        bias: LEAST_UPPER_BOUND
    });

    for (let i = 0; i < afterEndMappings.length; i++) {
        const afterEndMapping = afterEndMappings[i];
        if (afterEndMapping.line === null) continue;

        const original = originalPositionFor(sourceMap, afterEndMapping);
        // If the lines match, it means that something comes after our mapping,
        // so it must end where this one begins.
        if (original.line === beforeEndMapping.line) return original;
    }

    // If a generated mapping wasn't found (or all that were found were not on
    // the same line), then there's nothing after this range and we can
    // consider it to extend to infinity.
    return {
        source: beforeEndMapping.source,
        line: beforeEndMapping.line,
        column: Infinity
    };
}

/**
 * Attempts to determine the original source position, first
 * returning the closest element to the left (GREATEST_LOWER_BOUND),
 * and next returning the closest element to the right (LEAST_UPPER_BOUND).
 */
function originalPositionTryBoth(sourceMap, line, column) {
    const mapping = originalPositionFor(sourceMap, {
        line,
        column,
        bias: GREATEST_LOWER_BOUND
    });
    if (mapping.source === null) {
        return originalPositionFor(sourceMap, {
            line,
            column,
            bias: LEAST_UPPER_BOUND
        });
    } else {
        return mapping;
    }
}

function isInvalidPosition(pos) {
    return (
        !pos ||
        typeof pos.line !== 'number' ||
        typeof pos.column !== 'number' ||
        pos.line < 0 ||
        pos.column < 0
    );
}

/**
 * determines the original position for a given location
 * @param  {SourceMapConsumer} sourceMap the source map
 * @param  {Object} generatedLocation the original location Object
 * @returns {Object} the remapped location Object
 */
function getMapping(sourceMap, generatedLocation, origFile) {
    if (!generatedLocation) {
        return null;
    }

    if (
        isInvalidPosition(generatedLocation.start) ||
        isInvalidPosition(generatedLocation.end)
    ) {
        return null;
    }

    const start = originalPositionTryBoth(
        sourceMap,
        generatedLocation.start.line,
        generatedLocation.start.column
    );
    let end = originalEndPositionFor(sourceMap, generatedLocation.end);

    /* istanbul ignore if: edge case too hard to test for */
    if (!(start && end)) {
        return null;
    }

    if (!(start.source && end.source)) {
        return null;
    }

    if (start.source !== end.source) {
        return null;
    }

    /* istanbul ignore if: edge case too hard to test for */
    if (start.line === null || start.column === null) {
        return null;
    }

    /* istanbul ignore if: edge case too hard to test for */
    if (end.line === null || end.column === null) {
        return null;
    }

    if (start.line === end.line && start.column === end.column) {
        end = originalPositionFor(sourceMap, {
            line: generatedLocation.end.line,
            column: generatedLocation.end.column,
            bias: LEAST_UPPER_BOUND
        });
        end.column -= 1;
    }

    return {
        source: pathutils.relativeTo(start.source, origFile),
        loc: {
            start: {
                line: start.line,
                column: start.column
            },
            end: {
                line: end.line,
                column: end.column
            }
        }
    };
}

module.exports = getMapping;
