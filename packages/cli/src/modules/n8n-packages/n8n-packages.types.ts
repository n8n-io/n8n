import type { User } from '@n8n/db';

export interface ExportWorkflowsRequest {
	user: User;
	workflowIds: string[];
}
