export type ProjectSourceResponse = {
    branchName: string;
    contentPath: string;
    isInternal: boolean;
};
export type UpsertRemoteResponse = {
    id: string;
    type: 'CICD';
    mountPath: string;
    mountBranchName: string;
    organizationId: string;
    projectId: string;
};
export type ListRemotesResponse = {
    object: 'list';
    page: {
        endCursor: string;
        startCursor: string;
        haxNextPage: boolean;
        hasPrevPage: boolean;
        limit: number;
        total: number;
    };
    items: Remote[];
};
export type Remote = {
    mountPath: string;
    type: string;
    autoSync: boolean;
    autoMerge: boolean;
    createdAt: string;
    updatedAt: string;
    providerType: string;
    namespaceId: string;
    repositoryId: string;
    projectId: string;
    mountBranchName: string;
    contentPath: string;
    credentialId: string;
    branchName: string;
    contentType: string;
    id: string;
};
export type PushResponse = {
    id: string;
    remoteId: string;
    isMainBranch: boolean;
    isOutdated: boolean;
    hasChanges: boolean;
    replace: boolean;
    scoutJobId: string | null;
    uploadedFiles: Array<{
        path: string;
        mimeType: string;
    }>;
    commit: {
        branchName: string;
        message: string;
        createdAt: string | null;
        namespaceId: string | null;
        repositoryId: string | null;
        url: string | null;
        sha: string | null;
        author: {
            name: string;
            email: string;
            image: string | null;
        };
        statuses: Array<{
            name: string;
            description: string;
            status: 'pending' | 'running' | 'success' | 'failed';
            url: string | null;
        }>;
    };
    remote: {
        commits: {
            sha: string;
            branchName: string;
        }[];
    };
    status: PushStatusResponse;
};
export type DeploymentStatusResponse = {
    deploy: {
        url: string | null;
        status: DeploymentStatus;
    };
    scorecard: ScorecardItem[];
};
export type PushStatusResponse = {
    preview: DeploymentStatusResponse;
    production: DeploymentStatusResponse;
};
export type ScorecardItem = {
    name: string;
    status: PushStatusBase;
    description: string;
    url: string;
};
export type PushStatusBase = 'pending' | 'success' | 'running' | 'failed';
export type DeploymentStatus = 'skipped' | PushStatusBase;
