/** A ranged cache */
import { extendBuffer } from './buffer.js';
/**
 * The cache for a specific resource
 * @internal
 */
export class Resource {
    id;
    _size;
    options;
    /** Regions used to reduce unneeded allocations. Think of sparse arrays. */
    regions = [];
    /** The full size of the resource */
    get size() {
        return this._size;
    }
    set size(value) {
        if (value >= this._size) {
            this._size = value;
            return;
        }
        this._size = value;
        for (let i = this.regions.length - 1; i >= 0; i--) {
            const region = this.regions[i];
            if (region.offset >= value) {
                this.regions.splice(i, 1);
                continue;
            }
            const maxLength = value - region.offset;
            if (region.data.byteLength > maxLength) {
                region.data = region.data.subarray(0, maxLength);
            }
            region.ranges = region.ranges
                .filter(range => range.start < value)
                .map(range => {
                if (range.end > value) {
                    return { start: range.start, end: value };
                }
                return range;
            });
        }
    }
    constructor(
    /** The resource ID */
    id, _size, options, resources) {
        this.id = id;
        this._size = _size;
        this.options = options;
        options.sparse ??= true;
        if (!options.sparse)
            this.regions.push({ offset: 0, data: new Uint8Array(_size), ranges: [] });
        resources?.set(id, this);
    }
    /** Combines adjacent regions and combines adjacent ranges within a region */
    collect() {
        if (!this.options.sparse)
            return;
        const { regionGapThreshold = 0xfff } = this.options;
        for (let i = 0; i < this.regions.length - 1;) {
            const current = this.regions[i];
            const next = this.regions[i + 1];
            if (next.offset - (current.offset + current.data.byteLength) > regionGapThreshold) {
                i++;
                continue;
            }
            // Combine ranges
            current.ranges.push(...next.ranges);
            current.ranges.sort((a, b) => a.start - b.start);
            // Combine overlapping/adjacent ranges
            current.ranges = current.ranges.reduce((acc, range) => {
                if (!acc.length || acc.at(-1).end < range.start) {
                    acc.push(range);
                }
                else {
                    acc.at(-1).end = Math.max(acc.at(-1).end, range.end);
                }
                return acc;
            }, []);
            // Extend buffer to include the new region
            current.data = extendBuffer(current.data, next.offset + next.data.byteLength);
            current.data.set(next.data, next.offset - current.offset);
            // Remove the next region after merging
            this.regions.splice(i + 1, 1);
        }
    }
    /** Takes an initial range and finds the sub-ranges that are not in the cache */
    missing(start, end) {
        const missingRanges = [];
        for (const region of this.regions) {
            if (region.offset >= end)
                break;
            for (const range of region.ranges) {
                if (range.end <= start)
                    continue;
                if (range.start >= end)
                    break;
                if (range.start > start) {
                    missingRanges.push({ start, end: Math.min(range.start, end) });
                }
                // Adjust the current start if the region overlaps
                if (range.end > start)
                    start = Math.max(start, range.end);
                if (start >= end)
                    break;
            }
            if (start >= end)
                break;
        }
        // If there are still missing parts at the end
        if (start < end)
            missingRanges.push({ start, end });
        return missingRanges;
    }
    /**
     * Get the cached sub-ranges of an initial range.
     * This is conceptually the inverse of `missing`.
     */
    cached(start, end) {
        const cachedRanges = [];
        for (const region of this.regions) {
            if (region.offset >= end)
                break;
            for (const range of region.ranges) {
                if (range.end <= start)
                    continue;
                if (range.start >= end)
                    break;
                cachedRanges.push({
                    start: Math.max(start, range.start),
                    end: Math.min(end, range.end),
                });
            }
        }
        cachedRanges.sort((a, b) => a.start - b.start);
        const merged = [];
        for (const curr of cachedRanges) {
            const last = merged.at(-1);
            if (last && curr.start <= last.end) {
                last.end = Math.max(last.end, curr.end);
            }
            else {
                merged.push(curr);
            }
        }
        return merged;
    }
    /** Get the region who's ranges include an offset */
    regionAt(offset) {
        if (!this.regions.length)
            return;
        for (const region of this.regions) {
            if (region.offset > offset)
                break;
            // Check if the offset is within this region
            if (offset >= region.offset && offset < region.offset + region.data.byteLength)
                return region;
        }
    }
    /** Add new data to the cache at given specified offset */
    add(data, offset) {
        const end = offset + data.byteLength;
        const region = this.regionAt(offset);
        if (region) {
            region.data = extendBuffer(region.data, end);
            region.data.set(data, offset);
            region.ranges.push({ start: offset, end });
            region.ranges.sort((a, b) => a.start - b.start);
            this.collect();
            return this;
        }
        // Find the correct index to insert the new region
        const newRegion = { data, offset: offset, ranges: [{ start: offset, end }] };
        const insertIndex = this.regions.findIndex(region => region.offset > offset);
        // Insert at the right index to keep regions sorted
        if (insertIndex == -1) {
            this.regions.push(newRegion); // Append if no later region exists
        }
        else {
            this.regions.splice(insertIndex, 0, newRegion); // Insert before the first region with a greater offset
        }
        this.collect();
        return this;
    }
}
