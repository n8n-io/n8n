import { RangeCov } from "./types";
export declare class RangeTree {
    start: number;
    end: number;
    delta: number;
    children: RangeTree[];
    constructor(start: number, end: number, delta: number, children: RangeTree[]);
    /**
     * @precodition `ranges` are well-formed and pre-order sorted
     */
    static fromSortedRanges(ranges: ReadonlyArray<RangeCov>): RangeTree | undefined;
    normalize(): void;
    /**
     * @precondition `tree.start < value && value < tree.end`
     * @return RangeTree Right part
     */
    split(value: number): RangeTree;
    /**
     * Get the range coverages corresponding to the tree.
     *
     * The ranges are pre-order sorted.
     */
    toRanges(): RangeCov[];
}
