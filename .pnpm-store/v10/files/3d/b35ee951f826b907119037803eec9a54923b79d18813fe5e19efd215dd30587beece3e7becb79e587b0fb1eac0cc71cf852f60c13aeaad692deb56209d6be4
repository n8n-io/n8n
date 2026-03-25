import { RangeCov } from "./types";
interface ReadonlyRangeTree {
    readonly start: number;
    readonly end: number;
    readonly count: number;
    readonly children: ReadonlyRangeTree[];
}
export declare function emitForest(trees: ReadonlyArray<ReadonlyRangeTree>): string;
export declare function emitForestLines(trees: ReadonlyArray<ReadonlyRangeTree>): string[];
export declare function parseFunctionRanges(text: string, offsetMap: Map<number, number>): RangeCov[];
export declare function parseOffsets(text: string): Map<number, number>;
export {};
