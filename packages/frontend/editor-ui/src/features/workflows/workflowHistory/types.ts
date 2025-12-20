import type { WorkflowHistoryActionTypes, WorkflowVersionId } from '@n8n/rest-api-client';

export type WorkflowHistoryAction = {
	action: WorkflowHistoryActionTypes[number];
	id: WorkflowVersionId;
	data: {
		formattedCreatedAt: string;
		versionName?: string | null;
		description?: string | null;
	};
};
