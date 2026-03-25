import type { SourceMapSegment } from './sourcemap-segment';
import type { TraceMap } from './trace-mapping';
export interface SourceMapV3 {
    file?: string | null;
    names: string[];
    sourceRoot?: string;
    sources: (string | null)[];
    sourcesContent?: (string | null)[];
    version: 3;
}
export interface EncodedSourceMap extends SourceMapV3 {
    mappings: string;
}
export interface DecodedSourceMap extends SourceMapV3 {
    mappings: SourceMapSegment[][];
}
export interface Section {
    offset: {
        line: number;
        column: number;
    };
    map: EncodedSourceMap | DecodedSourceMap | SectionedSourceMap;
}
export interface SectionedSourceMap {
    file?: string | null;
    sections: Section[];
    version: 3;
}
export declare type OriginalMapping = {
    source: string | null;
    line: number;
    column: number;
    name: string | null;
};
export declare type InvalidOriginalMapping = {
    source: null;
    line: null;
    column: null;
    name: null;
};
export declare type GeneratedMapping = {
    line: number;
    column: number;
};
export declare type InvalidGeneratedMapping = {
    line: null;
    column: null;
};
export declare type SourceMapInput = string | EncodedSourceMap | DecodedSourceMap | TraceMap;
export declare type SectionedSourceMapInput = SourceMapInput | SectionedSourceMap;
export declare type Needle = {
    line: number;
    column: number;
    bias?: 1 | -1;
};
export declare type SourceNeedle = {
    source: string;
    line: number;
    column: number;
    bias?: 1 | -1;
};
export declare type EachMapping = {
    generatedLine: number;
    generatedColumn: number;
    source: null;
    originalLine: null;
    originalColumn: null;
    name: null;
} | {
    generatedLine: number;
    generatedColumn: number;
    source: string | null;
    originalLine: number;
    originalColumn: number;
    name: string | null;
};
export declare abstract class SourceMap {
    version: SourceMapV3['version'];
    file: SourceMapV3['file'];
    names: SourceMapV3['names'];
    sourceRoot: SourceMapV3['sourceRoot'];
    sources: SourceMapV3['sources'];
    sourcesContent: SourceMapV3['sourcesContent'];
    resolvedSources: SourceMapV3['sources'];
}
