// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * Generate a range string. For example:
 *
 * "bytes=255-" or "bytes=0-511"
 *
 * @param iRange -
 */
export function rangeToString(iRange) {
    if (iRange.offset < 0) {
        throw new RangeError(`Range.offset cannot be smaller than 0.`);
    }
    if (iRange.count && iRange.count <= 0) {
        throw new RangeError(`Range.count must be larger than 0. Leave it undefined if you want a range from offset to the end.`);
    }
    return iRange.count
        ? `bytes=${iRange.offset}-${iRange.offset + iRange.count - 1}`
        : `bytes=${iRange.offset}-`;
}
//# sourceMappingURL=Range.js.map