import { z } from 'zod';

import { Config, Env } from '../decorators';

const workflowExternalIdModeSchema = z.enum(['MUTABLE', 'MATCH_WORKFLOW_ID']);
type WorkflowExternalIdMode = z.infer<typeof workflowExternalIdModeSchema>;

@Config
export class ExternalIdConfig {
	/**
	 * Controls how the workflow `externalId` field behaves.
	 * - MUTABLE (default): freely settable/editable via the API, never auto-assigned.
	 * - MATCH_WORKFLOW_ID: always forced to equal the workflow's own `id` at
	 *   creation, and immutable thereafter.
	 */
	@Env('N8N_WORKFLOW_EXTERNAL_ID', workflowExternalIdModeSchema)
	workflowExternalId: WorkflowExternalIdMode = 'MUTABLE';
}
