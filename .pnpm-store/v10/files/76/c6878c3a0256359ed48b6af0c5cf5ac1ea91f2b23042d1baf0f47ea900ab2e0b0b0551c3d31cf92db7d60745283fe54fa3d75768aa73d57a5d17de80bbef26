type CodeRangeKey = 'sourceOffsets' | 'generatedOffsets';
export interface Mapping<Data = unknown> {
    sourceOffsets: number[];
    generatedOffsets: number[];
    lengths: number[];
    generatedLengths?: number[];
    data: Data;
}
export declare class SourceMap<Data = unknown> {
    readonly mappings: Mapping<Data>[];
    private sourceCodeOffsetsMemo;
    private generatedCodeOffsetsMemo;
    constructor(mappings: Mapping<Data>[]);
    toSourceRange(generatedStart: number, generatedEnd: number, fallbackToAnyMatch: boolean, filter?: (data: Data) => boolean): Generator<[mappedStart: number, mappedEnd: number, startMapping: Mapping<Data>, endMapping: Mapping<Data>], any, any>;
    toGeneratedRange(sourceStart: number, sourceEnd: number, fallbackToAnyMatch: boolean, filter?: (data: Data) => boolean): Generator<[mappedStart: number, mappedEnd: number, startMapping: Mapping<Data>, endMapping: Mapping<Data>], any, any>;
    toSourceLocation(generatedOffset: number, filter?: (data: Data) => boolean): Generator<readonly [number, Mapping<Data>], void, unknown>;
    toGeneratedLocation(sourceOffset: number, filter?: (data: Data) => boolean): Generator<readonly [number, Mapping<Data>], void, unknown>;
    findMatchingOffsets(offset: number, fromRange: CodeRangeKey, filter?: (data: Data) => boolean): Generator<readonly [number, Mapping<Data>], void, unknown>;
    findMatchingStartEnd(start: number, end: number, fallbackToAnyMatch: boolean, fromRange: CodeRangeKey, filter?: (data: Data) => boolean): Generator<[mappedStart: number, mappedEnd: number, startMapping: Mapping<Data>, endMapping: Mapping<Data>]>;
    private getMemoBasedOnRange;
    private createMemo;
}
export {};
