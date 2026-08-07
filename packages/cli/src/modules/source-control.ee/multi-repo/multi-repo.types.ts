import type { SourceControlConnectionType } from './source-control-connection.entity';
import type { SourceControlScopeType } from './source-control-scope.entity';
import type { KeyPairType } from '../types/key-pair-type';

// POC (LIGO-923): plain module types instead of zod DTOs in @n8n/api-types.
// The frontend re-declares these shapes; promote to @n8n/api-types when this
// graduates from POC.

export interface ConnectionScopeResponse {
	id: string;
	scopeType: SourceControlScopeType;
	projectId: string | null;
}

export interface ConnectionResponse {
	id: string;
	repositoryUrl: string;
	branchName: string;
	branchReadOnly: boolean;
	branchColor: string;
	connectionType: SourceControlConnectionType;
	connected: boolean;
	publicKey: string | null;
	scopes: ConnectionScopeResponse[];
}

export interface CreateConnectionPayload {
	repositoryUrl: string;
	connectionType: SourceControlConnectionType;
	branchName?: string;
	branchColor?: string;
	branchReadOnly?: boolean;
	httpsUsername?: string;
	httpsPassword?: string;
	keyGeneratorType?: KeyPairType;
}

export interface UpdateConnectionPayload {
	branchName?: string;
	branchColor?: string;
	branchReadOnly?: boolean;
	httpsUsername?: string;
	httpsPassword?: string;
}

export interface ClaimScopePayload {
	scopeType: SourceControlScopeType;
	projectId?: string;
}

export interface ConnectionStatusFile {
	path: string;
	status: 'A' | 'M' | 'D';
}

export interface ConnectionStatus {
	branchName: string;
	files: ConnectionStatusFile[];
}

export interface ConnectionPushRequest {
	commitMessage?: string;
}

export interface ConnectionPushResult {
	commitHash: string;
	pushedFiles: ConnectionStatusFile[];
}
