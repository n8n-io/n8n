import { PullDetailFileChanges, PullDetailSummary, PullFailedResult, PullResult } from '../../../typings';
export declare class PullSummary implements PullResult {
    remoteMessages: {
        all: never[];
    };
    created: never[];
    deleted: string[];
    files: string[];
    deletions: PullDetailFileChanges;
    insertions: PullDetailFileChanges;
    summary: PullDetailSummary;
}
export declare class PullFailedSummary implements PullFailedResult {
    remote: string;
    hash: {
        local: string;
        remote: string;
    };
    branch: {
        local: string;
        remote: string;
    };
    message: string;
    toString(): string;
}
