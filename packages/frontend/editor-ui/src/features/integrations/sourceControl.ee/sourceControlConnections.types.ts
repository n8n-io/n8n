// Multi-repo source control connections (LIGO-923 POC). These mirror the plain
// module types in packages/cli source-control.ee/multi-repo/multi-repo.types.ts;
// promote to @n8n/api-types when this graduates from POC.

export type SourceControlConnectionType = 'ssh' | 'https';
export type SourceControlScopeType = 'project' | 'instance';

export interface SourceControlConnectionScope {
	id: string;
	scopeType: SourceControlScopeType;
	projectId: string | null;
}

export interface SourceControlConnectionDto {
	id: string;
	repositoryUrl: string;
	branchName: string;
	branchReadOnly: boolean;
	branchColor: string;
	connectionType: SourceControlConnectionType;
	connected: boolean;
	publicKey: string | null;
	scopes: SourceControlConnectionScope[];
}

export interface CreateConnectionPayload {
	repositoryUrl: string;
	connectionType: SourceControlConnectionType;
	branchName?: string;
	branchColor?: string;
	branchReadOnly?: boolean;
	httpsUsername?: string;
	httpsPassword?: string;
	keyGeneratorType?: 'ed25519' | 'rsa';
}

export interface UpdateConnectionPayload {
	branchName?: string;
	branchColor?: string;
	branchReadOnly?: boolean;
	httpsUsername?: string;
	httpsPassword?: string;
}

export interface ConnectionStatusFile {
	path: string;
	status: 'A' | 'M' | 'D';
}

export interface ConnectionStatus {
	branchName: string;
	files: ConnectionStatusFile[];
}

export interface ConnectionPushResult {
	commitHash: string;
	pushedFiles: ConnectionStatusFile[];
}
