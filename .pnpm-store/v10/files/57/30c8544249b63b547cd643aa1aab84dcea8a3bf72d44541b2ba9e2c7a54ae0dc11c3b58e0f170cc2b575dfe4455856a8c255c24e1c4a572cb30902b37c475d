import { MergeConflict, MergeConflictDeletion, MergeDetail, MergeResultStatus } from '../../../typings';
export declare class MergeSummaryConflict implements MergeConflict {
    readonly reason: string;
    readonly file: string | null;
    readonly meta?: MergeConflictDeletion | undefined;
    constructor(reason: string, file?: string | null, meta?: MergeConflictDeletion | undefined);
    toString(): string;
}
export declare class MergeSummaryDetail implements MergeDetail {
    conflicts: MergeConflict[];
    merges: string[];
    result: MergeResultStatus;
    get failed(): boolean;
    get reason(): string;
    toString(): string;
}
