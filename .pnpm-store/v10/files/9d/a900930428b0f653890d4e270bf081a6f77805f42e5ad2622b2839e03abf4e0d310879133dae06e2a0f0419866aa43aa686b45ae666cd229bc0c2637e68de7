import { BranchMultiDeleteResult, BranchSingleDeleteFailure, BranchSingleDeleteResult, BranchSingleDeleteSuccess } from '../../../typings';
export declare class BranchDeletionBatch implements BranchMultiDeleteResult {
    all: BranchSingleDeleteResult[];
    branches: {
        [branchName: string]: BranchSingleDeleteResult;
    };
    errors: BranchSingleDeleteResult[];
    get success(): boolean;
}
export declare function branchDeletionSuccess(branch: string, hash: string): BranchSingleDeleteSuccess;
export declare function branchDeletionFailure(branch: string): BranchSingleDeleteFailure;
export declare function isSingleBranchDeleteFailure(test: BranchSingleDeleteResult): test is BranchSingleDeleteSuccess;
