import { z } from 'zod';

import { Z } from './zod-class';

/** Query for `GET /instance-ai/provenance`. */
export class InstanceAiProvenanceListQuery extends Z.class({
	limit: z.coerce.number().int().min(1).max(100).default(50),
}) {}

/** The Assistant chat that built a workflow, as the viewer may see it. */
export interface InstanceAiWorkflowProvenance {
	workflowId: string;
	threadId: string;
	/** ISO 8601 time at which the workflow was kept. */
	createdAt: string;
	/** True only when the viewer owns the chat. */
	canOpenThread: boolean;
}

/** One workflow in the viewer's list of Assistant-built workflows. */
export interface InstanceAiProvenanceListItem extends InstanceAiWorkflowProvenance {
	name: string;
	active: boolean;
}

export interface InstanceAiProvenanceListResponse {
	items: InstanceAiProvenanceListItem[];
}

/** `provenance` is null when the Assistant did not build the workflow. */
export interface InstanceAiWorkflowProvenanceResponse {
	provenance: InstanceAiWorkflowProvenance | null;
}
