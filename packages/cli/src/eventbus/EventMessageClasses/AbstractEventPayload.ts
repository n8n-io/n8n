import type { IWorkflowBase, JsonValue } from 'n8n-workflow';

export interface AbstractEventPayload {
	[key: string]: JsonValue | IWorkflowBase | undefined;
}
