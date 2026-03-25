import type { ReverseSegment, SourceMapSegment } from './sourcemap-segment';
import type { MemoState } from './binary-search';
export declare type Source = {
    __proto__: null;
    [line: number]: Exclude<ReverseSegment, [number]>[];
};
export default function buildBySources(decoded: readonly SourceMapSegment[][], memos: MemoState[]): Source[];
