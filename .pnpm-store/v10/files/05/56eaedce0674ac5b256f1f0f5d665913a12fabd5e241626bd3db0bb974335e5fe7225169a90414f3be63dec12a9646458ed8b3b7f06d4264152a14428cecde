(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@jridgewell/sourcemap-codec'), require('@jridgewell/resolve-uri')) :
    typeof define === 'function' && define.amd ? define(['exports', '@jridgewell/sourcemap-codec', '@jridgewell/resolve-uri'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.traceMapping = {}, global.sourcemapCodec, global.resolveURI));
})(this, (function (exports, sourcemapCodec, resolveUri) { 'use strict';

    function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

    var resolveUri__default = /*#__PURE__*/_interopDefaultLegacy(resolveUri);

    function resolve(input, base) {
        // The base is always treated as a directory, if it's not empty.
        // https://github.com/mozilla/source-map/blob/8cb3ee57/lib/util.js#L327
        // https://github.com/chromium/chromium/blob/da4adbb3/third_party/blink/renderer/devtools/front_end/sdk/SourceMap.js#L400-L401
        if (base && !base.endsWith('/'))
            base += '/';
        return resolveUri__default["default"](input, base);
    }

    /**
     * Removes everything after the last "/", but leaves the slash.
     */
    function stripFilename(path) {
        if (!path)
            return '';
        const index = path.lastIndexOf('/');
        return path.slice(0, index + 1);
    }

    const COLUMN = 0;
    const SOURCES_INDEX = 1;
    const SOURCE_LINE = 2;
    const SOURCE_COLUMN = 3;
    const NAMES_INDEX = 4;
    const REV_GENERATED_LINE = 1;
    const REV_GENERATED_COLUMN = 2;

    function maybeSort(mappings, owned) {
        const unsortedIndex = nextUnsortedSegmentLine(mappings, 0);
        if (unsortedIndex === mappings.length)
            return mappings;
        // If we own the array (meaning we parsed it from JSON), then we're free to directly mutate it. If
        // not, we do not want to modify the consumer's input array.
        if (!owned)
            mappings = mappings.slice();
        for (let i = unsortedIndex; i < mappings.length; i = nextUnsortedSegmentLine(mappings, i + 1)) {
            mappings[i] = sortSegments(mappings[i], owned);
        }
        return mappings;
    }
    function nextUnsortedSegmentLine(mappings, start) {
        for (let i = start; i < mappings.length; i++) {
            if (!isSorted(mappings[i]))
                return i;
        }
        return mappings.length;
    }
    function isSorted(line) {
        for (let j = 1; j < line.length; j++) {
            if (line[j][COLUMN] < line[j - 1][COLUMN]) {
                return false;
            }
        }
        return true;
    }
    function sortSegments(line, owned) {
        if (!owned)
            line = line.slice();
        return line.sort(sortComparator);
    }
    function sortComparator(a, b) {
        return a[COLUMN] - b[COLUMN];
    }

    let found = false;
    /**
     * A binary search implementation that returns the index if a match is found.
     * If no match is found, then the left-index (the index associated with the item that comes just
     * before the desired index) is returned. To maintain proper sort order, a splice would happen at
     * the next index:
     *
     * ```js
     * const array = [1, 3];
     * const needle = 2;
     * const index = binarySearch(array, needle, (item, needle) => item - needle);
     *
     * assert.equal(index, 0);
     * array.splice(index + 1, 0, needle);
     * assert.deepEqual(array, [1, 2, 3]);
     * ```
     */
    function binarySearch(haystack, needle, low, high) {
        while (low <= high) {
            const mid = low + ((high - low) >> 1);
            const cmp = haystack[mid][COLUMN] - needle;
            if (cmp === 0) {
                found = true;
                return mid;
            }
            if (cmp < 0) {
                low = mid + 1;
            }
            else {
                high = mid - 1;
            }
        }
        found = false;
        return low - 1;
    }
    function upperBound(haystack, needle, index) {
        for (let i = index + 1; i < haystack.length; i++, index++) {
            if (haystack[i][COLUMN] !== needle)
                break;
        }
        return index;
    }
    function lowerBound(haystack, needle, index) {
        for (let i = index - 1; i >= 0; i--, index--) {
            if (haystack[i][COLUMN] !== needle)
                break;
        }
        return index;
    }
    function memoizedState() {
        return {
            lastKey: -1,
            lastNeedle: -1,
            lastIndex: -1,
        };
    }
    /**
     * This overly complicated beast is just to record the last tested line/column and the resulting
     * index, allowing us to skip a few tests if mappings are monotonically increasing.
     */
    function memoizedBinarySearch(haystack, needle, state, key) {
        const { lastKey, lastNeedle, lastIndex } = state;
        let low = 0;
        let high = haystack.length - 1;
        if (key === lastKey) {
            if (needle === lastNeedle) {
                found = lastIndex !== -1 && haystack[lastIndex][COLUMN] === needle;
                return lastIndex;
            }
            if (needle >= lastNeedle) {
                // lastIndex may be -1 if the previous needle was not found.
                low = lastIndex === -1 ? 0 : lastIndex;
            }
            else {
                high = lastIndex;
            }
        }
        state.lastKey = key;
        state.lastNeedle = needle;
        return (state.lastIndex = binarySearch(haystack, needle, low, high));
    }

    // Rebuilds the original source files, with mappings that are ordered by source line/column instead
    // of generated line/column.
    function buildBySources(decoded, memos) {
        const sources = memos.map(buildNullArray);
        for (let i = 0; i < decoded.length; i++) {
            const line = decoded[i];
            for (let j = 0; j < line.length; j++) {
                const seg = line[j];
                if (seg.length === 1)
                    continue;
                const sourceIndex = seg[SOURCES_INDEX];
                const sourceLine = seg[SOURCE_LINE];
                const sourceColumn = seg[SOURCE_COLUMN];
                const originalSource = sources[sourceIndex];
                const originalLine = (originalSource[sourceLine] || (originalSource[sourceLine] = []));
                const memo = memos[sourceIndex];
                // The binary search either found a match, or it found the left-index just before where the
                // segment should go. Either way, we want to insert after that. And there may be multiple
                // generated segments associated with an original location, so there may need to move several
                // indexes before we find where we need to insert.
                const index = upperBound(originalLine, sourceColumn, memoizedBinarySearch(originalLine, sourceColumn, memo, sourceLine));
                insert(originalLine, (memo.lastIndex = index + 1), [sourceColumn, i, seg[COLUMN]]);
            }
        }
        return sources;
    }
    function insert(array, index, value) {
        for (let i = array.length; i > index; i--) {
            array[i] = array[i - 1];
        }
        array[index] = value;
    }
    // Null arrays allow us to use ordered index keys without actually allocating contiguous memory like
    // a real array. We use a null-prototype object to avoid prototype pollution and deoptimizations.
    // Numeric properties on objects are magically sorted in ascending order by the engine regardless of
    // the insertion order. So, by setting any numeric keys, even out of order, we'll get ascending
    // order when iterating with for-in.
    function buildNullArray() {
        return { __proto__: null };
    }

    const AnyMap = function (map, mapUrl) {
        const parsed = typeof map === 'string' ? JSON.parse(map) : map;
        if (!('sections' in parsed))
            return new TraceMap(parsed, mapUrl);
        const mappings = [];
        const sources = [];
        const sourcesContent = [];
        const names = [];
        const { sections } = parsed;
        let i = 0;
        for (; i < sections.length - 1; i++) {
            const no = sections[i + 1].offset;
            addSection(sections[i], mapUrl, mappings, sources, sourcesContent, names, no.line, no.column);
        }
        if (sections.length > 0) {
            addSection(sections[i], mapUrl, mappings, sources, sourcesContent, names, Infinity, Infinity);
        }
        const joined = {
            version: 3,
            file: parsed.file,
            names,
            sources,
            sourcesContent,
            mappings,
        };
        return exports.presortedDecodedMap(joined);
    };
    function addSection(section, mapUrl, mappings, sources, sourcesContent, names, stopLine, stopColumn) {
        const map = AnyMap(section.map, mapUrl);
        const { line: lineOffset, column: columnOffset } = section.offset;
        const sourcesOffset = sources.length;
        const namesOffset = names.length;
        const decoded = exports.decodedMappings(map);
        const { resolvedSources } = map;
        append(sources, resolvedSources);
        append(sourcesContent, map.sourcesContent || fillSourcesContent(resolvedSources.length));
        append(names, map.names);
        // If this section jumps forwards several lines, we need to add lines to the output mappings catch up.
        for (let i = mappings.length; i <= lineOffset; i++)
            mappings.push([]);
        // We can only add so many lines before we step into the range that the next section's map
        // controls. When we get to the last line, then we'll start checking the segments to see if
        // they've crossed into the column range.
        const stopI = stopLine - lineOffset;
        const len = Math.min(decoded.length, stopI + 1);
        for (let i = 0; i < len; i++) {
            const line = decoded[i];
            // On the 0th loop, the line will already exist due to a previous section, or the line catch up
            // loop above.
            const out = i === 0 ? mappings[lineOffset] : (mappings[lineOffset + i] = []);
            // On the 0th loop, the section's column offset shifts us forward. On all other lines (since the
            // map can be multiple lines), it doesn't.
            const cOffset = i === 0 ? columnOffset : 0;
            for (let j = 0; j < line.length; j++) {
                const seg = line[j];
                const column = cOffset + seg[COLUMN];
                // If this segment steps into the column range that the next section's map controls, we need
                // to stop early.
                if (i === stopI && column >= stopColumn)
                    break;
                if (seg.length === 1) {
                    out.push([column]);
                    continue;
                }
                const sourcesIndex = sourcesOffset + seg[SOURCES_INDEX];
                const sourceLine = seg[SOURCE_LINE];
                const sourceColumn = seg[SOURCE_COLUMN];
                if (seg.length === 4) {
                    out.push([column, sourcesIndex, sourceLine, sourceColumn]);
                    continue;
                }
                out.push([column, sourcesIndex, sourceLine, sourceColumn, namesOffset + seg[NAMES_INDEX]]);
            }
        }
    }
    function append(arr, other) {
        for (let i = 0; i < other.length; i++)
            arr.push(other[i]);
    }
    // Sourcemaps don't need to have sourcesContent, and if they don't, we need to create an array of
    // equal length to the sources. This is because the sources and sourcesContent are paired arrays,
    // where `sourcesContent[i]` is the content of the `sources[i]` file. If we didn't, then joined
    // sourcemap would desynchronize the sources/contents.
    function fillSourcesContent(len) {
        const sourcesContent = [];
        for (let i = 0; i < len; i++)
            sourcesContent[i] = null;
        return sourcesContent;
    }

    const INVALID_ORIGINAL_MAPPING = Object.freeze({
        source: null,
        line: null,
        column: null,
        name: null,
    });
    const INVALID_GENERATED_MAPPING = Object.freeze({
        line: null,
        column: null,
    });
    const LINE_GTR_ZERO = '`line` must be greater than 0 (lines start at line 1)';
    const COL_GTR_EQ_ZERO = '`column` must be greater than or equal to 0 (columns start at column 0)';
    const LEAST_UPPER_BOUND = -1;
    const GREATEST_LOWER_BOUND = 1;
    /**
     * Returns the encoded (VLQ string) form of the SourceMap's mappings field.
     */
    exports.encodedMappings = void 0;
    /**
     * Returns the decoded (array of lines of segments) form of the SourceMap's mappings field.
     */
    exports.decodedMappings = void 0;
    /**
     * A low-level API to find the segment associated with a generated line/column (think, from a
     * stack trace). Line and column here are 0-based, unlike `originalPositionFor`.
     */
    exports.traceSegment = void 0;
    /**
     * A higher-level API to find the source/line/column associated with a generated line/column
     * (think, from a stack trace). Line is 1-based, but column is 0-based, due to legacy behavior in
     * `source-map` library.
     */
    exports.originalPositionFor = void 0;
    /**
     * Finds the source/line/column directly after the mapping returned by originalPositionFor, provided
     * the found mapping is from the same source and line as the originalPositionFor mapping.
     *
     * Eg, in the code `let id = 1`, `originalPositionAfter` could find the mapping associated with `1`
     * using the same needle that would return `id` when calling `originalPositionFor`.
     */
    exports.generatedPositionFor = void 0;
    /**
     * Iterates each mapping in generated position order.
     */
    exports.eachMapping = void 0;
    /**
     * A helper that skips sorting of the input map's mappings array, which can be expensive for larger
     * maps.
     */
    exports.presortedDecodedMap = void 0;
    /**
     * Returns a sourcemap object (with decoded mappings) suitable for passing to a library that expects
     * a sourcemap, or to JSON.stringify.
     */
    exports.decodedMap = void 0;
    /**
     * Returns a sourcemap object (with encoded mappings) suitable for passing to a library that expects
     * a sourcemap, or to JSON.stringify.
     */
    exports.encodedMap = void 0;
    class TraceMap {
        constructor(map, mapUrl) {
            this._decodedMemo = memoizedState();
            this._bySources = undefined;
            this._bySourceMemos = undefined;
            const isString = typeof map === 'string';
            if (!isString && map.constructor === TraceMap)
                return map;
            const parsed = (isString ? JSON.parse(map) : map);
            const { version, file, names, sourceRoot, sources, sourcesContent } = parsed;
            this.version = version;
            this.file = file;
            this.names = names;
            this.sourceRoot = sourceRoot;
            this.sources = sources;
            this.sourcesContent = sourcesContent;
            if (sourceRoot || mapUrl) {
                const from = resolve(sourceRoot || '', stripFilename(mapUrl));
                this.resolvedSources = sources.map((s) => resolve(s || '', from));
            }
            else {
                this.resolvedSources = sources.map((s) => s || '');
            }
            const { mappings } = parsed;
            if (typeof mappings === 'string') {
                this._encoded = mappings;
                this._decoded = undefined;
            }
            else {
                this._encoded = undefined;
                this._decoded = maybeSort(mappings, isString);
            }
        }
    }
    (() => {
        exports.encodedMappings = (map) => {
            var _a;
            return ((_a = map._encoded) !== null && _a !== void 0 ? _a : (map._encoded = sourcemapCodec.encode(map._decoded)));
        };
        exports.decodedMappings = (map) => {
            return (map._decoded || (map._decoded = sourcemapCodec.decode(map._encoded)));
        };
        exports.traceSegment = (map, line, column) => {
            const decoded = exports.decodedMappings(map);
            // It's common for parent source maps to have pointers to lines that have no
            // mapping (like a "//# sourceMappingURL=") at the end of the child file.
            if (line >= decoded.length)
                return null;
            return traceSegmentInternal(decoded[line], map._decodedMemo, line, column, GREATEST_LOWER_BOUND);
        };
        exports.originalPositionFor = (map, { line, column, bias }) => {
            line--;
            if (line < 0)
                throw new Error(LINE_GTR_ZERO);
            if (column < 0)
                throw new Error(COL_GTR_EQ_ZERO);
            const decoded = exports.decodedMappings(map);
            // It's common for parent source maps to have pointers to lines that have no
            // mapping (like a "//# sourceMappingURL=") at the end of the child file.
            if (line >= decoded.length)
                return INVALID_ORIGINAL_MAPPING;
            const segment = traceSegmentInternal(decoded[line], map._decodedMemo, line, column, bias || GREATEST_LOWER_BOUND);
            if (segment == null)
                return INVALID_ORIGINAL_MAPPING;
            if (segment.length == 1)
                return INVALID_ORIGINAL_MAPPING;
            const { names, resolvedSources } = map;
            return {
                source: resolvedSources[segment[SOURCES_INDEX]],
                line: segment[SOURCE_LINE] + 1,
                column: segment[SOURCE_COLUMN],
                name: segment.length === 5 ? names[segment[NAMES_INDEX]] : null,
            };
        };
        exports.generatedPositionFor = (map, { source, line, column, bias }) => {
            line--;
            if (line < 0)
                throw new Error(LINE_GTR_ZERO);
            if (column < 0)
                throw new Error(COL_GTR_EQ_ZERO);
            const { sources, resolvedSources } = map;
            let sourceIndex = sources.indexOf(source);
            if (sourceIndex === -1)
                sourceIndex = resolvedSources.indexOf(source);
            if (sourceIndex === -1)
                return INVALID_GENERATED_MAPPING;
            const generated = (map._bySources || (map._bySources = buildBySources(exports.decodedMappings(map), (map._bySourceMemos = sources.map(memoizedState)))));
            const memos = map._bySourceMemos;
            const segments = generated[sourceIndex][line];
            if (segments == null)
                return INVALID_GENERATED_MAPPING;
            const segment = traceSegmentInternal(segments, memos[sourceIndex], line, column, bias || GREATEST_LOWER_BOUND);
            if (segment == null)
                return INVALID_GENERATED_MAPPING;
            return {
                line: segment[REV_GENERATED_LINE] + 1,
                column: segment[REV_GENERATED_COLUMN],
            };
        };
        exports.eachMapping = (map, cb) => {
            const decoded = exports.decodedMappings(map);
            const { names, resolvedSources } = map;
            for (let i = 0; i < decoded.length; i++) {
                const line = decoded[i];
                for (let j = 0; j < line.length; j++) {
                    const seg = line[j];
                    const generatedLine = i + 1;
                    const generatedColumn = seg[0];
                    let source = null;
                    let originalLine = null;
                    let originalColumn = null;
                    let name = null;
                    if (seg.length !== 1) {
                        source = resolvedSources[seg[1]];
                        originalLine = seg[2] + 1;
                        originalColumn = seg[3];
                    }
                    if (seg.length === 5)
                        name = names[seg[4]];
                    cb({
                        generatedLine,
                        generatedColumn,
                        source,
                        originalLine,
                        originalColumn,
                        name,
                    });
                }
            }
        };
        exports.presortedDecodedMap = (map, mapUrl) => {
            const clone = Object.assign({}, map);
            clone.mappings = [];
            const tracer = new TraceMap(clone, mapUrl);
            tracer._decoded = map.mappings;
            return tracer;
        };
        exports.decodedMap = (map) => {
            return {
                version: 3,
                file: map.file,
                names: map.names,
                sourceRoot: map.sourceRoot,
                sources: map.sources,
                sourcesContent: map.sourcesContent,
                mappings: exports.decodedMappings(map),
            };
        };
        exports.encodedMap = (map) => {
            return {
                version: 3,
                file: map.file,
                names: map.names,
                sourceRoot: map.sourceRoot,
                sources: map.sources,
                sourcesContent: map.sourcesContent,
                mappings: exports.encodedMappings(map),
            };
        };
    })();
    function traceSegmentInternal(segments, memo, line, column, bias) {
        let index = memoizedBinarySearch(segments, column, memo, line);
        if (found) {
            index = (bias === LEAST_UPPER_BOUND ? upperBound : lowerBound)(segments, column, index);
        }
        else if (bias === LEAST_UPPER_BOUND)
            index++;
        if (index === -1 || index === segments.length)
            return null;
        return segments[index];
    }

    exports.AnyMap = AnyMap;
    exports.GREATEST_LOWER_BOUND = GREATEST_LOWER_BOUND;
    exports.LEAST_UPPER_BOUND = LEAST_UPPER_BOUND;
    exports.TraceMap = TraceMap;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=trace-mapping.umd.js.map
