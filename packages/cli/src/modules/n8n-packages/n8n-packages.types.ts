import type { User } from '@n8n/db';

export interface ExportWorkflowsRequest {
	user: User;
	workflowIds: string[];
}

export interface ImportPackageRequest {
	user: User;
	projectId?: string;
	folderId?: string;
	packageBuffer: Buffer;
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
}
