import type { BranchSummary, BranchSummaryBranch } from '../../../typings';
export declare enum BranchStatusIdentifier {
    CURRENT = "*",
    LINKED = "+"
}
export declare class BranchSummaryResult implements BranchSummary {
    all: string[];
    branches: {
        [p: string]: BranchSummaryBranch;
    };
    current: string;
    detached: boolean;
    push(status: BranchStatusIdentifier | unknown, detached: boolean, name: string, commit: string, label: string): void;
}
