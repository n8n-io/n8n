import type { User, WorkflowEntity } from '@n8n/db';

export type { CredentialResolution } from './entities/credential/credential.types';

export type CredentialMatchingMode = 'id-only';
export type CredentialMissingMode = 'must-preexist';

export interface ExportWorkflowsRequest {
	user: User;
	workflowIds: string[];
}

export interface PreparedWorkflow {
	entity: WorkflowEntity;
	sourceId: string;
}

export interface ImportPackageRequest {
	user: User;
	projectId?: string;
	folderId?: string;
	packageBuffer: Buffer;
	credentialMatchingMode?: CredentialMatchingMode;
	credentialMissingMode?: CredentialMissingMode;
}

export interface ImportedWorkflowSummary {
	sourceId: string;
	localId: string;
	name: string;
	projectId: string;
	parentFolderId: string | null;
	activeVersionId: string | null;
}

export interface ImportResult {
	package: {
		sourceN8nVersion: string;
		sourceId: string;
		exportedAt: string;
	};
	workflows: ImportedWorkflowSummary[];
	credentials: {
		matched: Array<{ sourceId: string; targetId: string }>;
	};
}
