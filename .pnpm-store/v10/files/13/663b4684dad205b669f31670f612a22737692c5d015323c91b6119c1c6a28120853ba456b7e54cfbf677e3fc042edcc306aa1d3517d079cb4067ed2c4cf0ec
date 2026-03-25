import type { SourceMapSegment } from './sourcemap-segment';
import type { SourceMapV3, DecodedSourceMap, EncodedSourceMap, InvalidOriginalMapping, OriginalMapping, InvalidGeneratedMapping, GeneratedMapping, SourceMapInput, Needle, SourceNeedle, SourceMap, EachMapping } from './types';
export type { SourceMapSegment } from './sourcemap-segment';
export type { SourceMapInput, SectionedSourceMapInput, DecodedSourceMap, EncodedSourceMap, SectionedSourceMap, InvalidOriginalMapping, OriginalMapping as Mapping, OriginalMapping, InvalidGeneratedMapping, GeneratedMapping, EachMapping, } from './types';
export declare const LEAST_UPPER_BOUND = -1;
export declare const GREATEST_LOWER_BOUND = 1;
/**
 * Returns the encoded (VLQ string) form of the SourceMap's mappings field.
 */
export declare let encodedMappings: (map: TraceMap) => EncodedSourceMap['mappings'];
/**
 * Returns the decoded (array of lines of segments) form of the SourceMap's mappings field.
 */
export declare let decodedMappings: (map: TraceMap) => Readonly<DecodedSourceMap['mappings']>;
/**
 * A low-level API to find the segment associated with a generated line/column (think, from a
 * stack trace). Line and column here are 0-based, unlike `originalPositionFor`.
 */
export declare let traceSegment: (map: TraceMap, line: number, column: number) => Readonly<SourceMapSegment> | null;
/**
 * A higher-level API to find the source/line/column associated with a generated line/column
 * (think, from a stack trace). Line is 1-based, but column is 0-based, due to legacy behavior in
 * `source-map` library.
 */
export declare let originalPositionFor: (map: TraceMap, needle: Needle) => OriginalMapping | InvalidOriginalMapping;
/**
 * Finds the source/line/column directly after the mapping returned by originalPositionFor, provided
 * the found mapping is from the same source and line as the originalPositionFor mapping.
 *
 * Eg, in the code `let id = 1`, `originalPositionAfter` could find the mapping associated with `1`
 * using the same needle that would return `id` when calling `originalPositionFor`.
 */
export declare let generatedPositionFor: (map: TraceMap, needle: SourceNeedle) => GeneratedMapping | InvalidGeneratedMapping;
/**
 * Iterates each mapping in generated position order.
 */
export declare let eachMapping: (map: TraceMap, cb: (mapping: EachMapping) => void) => void;
/**
 * A helper that skips sorting of the input map's mappings array, which can be expensive for larger
 * maps.
 */
export declare let presortedDecodedMap: (map: DecodedSourceMap, mapUrl?: string) => TraceMap;
/**
 * Returns a sourcemap object (with decoded mappings) suitable for passing to a library that expects
 * a sourcemap, or to JSON.stringify.
 */
export declare let decodedMap: (map: TraceMap) => Omit<DecodedSourceMap, 'mappings'> & {
    mappings: readonly SourceMapSegment[][];
};
/**
 * Returns a sourcemap object (with encoded mappings) suitable for passing to a library that expects
 * a sourcemap, or to JSON.stringify.
 */
export declare let encodedMap: (map: TraceMap) => EncodedSourceMap;
export { AnyMap } from './any-map';
export declare class TraceMap implements SourceMap {
    version: SourceMapV3['version'];
    file: SourceMapV3['file'];
    names: SourceMapV3['names'];
    sourceRoot: SourceMapV3['sourceRoot'];
    sources: SourceMapV3['sources'];
    sourcesContent: SourceMapV3['sourcesContent'];
    resolvedSources: string[];
    private _encoded;
    private _decoded;
    private _decodedMemo;
    private _bySources;
    private _bySourceMemos;
    constructor(map: SourceMapInput, mapUrl?: string | null);
}
