import { BranchMultiDeleteResult, BranchSingleDeleteResult, BranchSummary } from '../../../typings';
import { StringTask } from '../types';
export declare function containsDeleteBranchCommand(commands: string[]): boolean;
export declare function branchTask(customArgs: string[]): StringTask<BranchSummary | BranchSingleDeleteResult>;
export declare function branchLocalTask(): StringTask<BranchSummary>;
export declare function deleteBranchesTask(branches: string[], forceDelete?: boolean): StringTask<BranchMultiDeleteResult>;
export declare function deleteBranchTask(branch: string, forceDelete?: boolean): StringTask<BranchSingleDeleteResult>;
