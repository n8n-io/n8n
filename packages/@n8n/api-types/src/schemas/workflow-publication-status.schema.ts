import { z } from 'zod';

// in_progress: currently being published
// published: all triggers activated
// partial: some triggers failed to activate
// failed: all triggers failed to activate
// not_published: no version is live
const workflowPublicationStatusValueSchema = z.enum([
	'in_progress',
	'published',
	'partial',
	'failed',
	'not_published',
]);

export const WorkflowPublicationStatusSchema = z.object({
	// overall status of the workflow publication process
	// NOTE: the trigger statuses are finalized at the end of the publication process,
	// so if there is a publication in progress, there may be some mismatch.
	status: workflowPublicationStatusValueSchema,
	// version whose triggers are currently registered; null if nothing is live
	liveVersionId: z.string().nullable(),
	// version being published right now; null unless status === 'in_progress'
	pendingVersionId: z.string().nullable(),
	triggers: z.array(
		z.object({
			nodeId: z.string(),
			status: z.enum(['activated', 'failed']),
			errorMessage: z.string().nullable(),
		}),
	),
});

export type WorkflowPublicationStatus = z.infer<typeof WorkflowPublicationStatusSchema>;

// The list page surfaces only settled/terminal states (no in_progress, no not_published):
// a workflow with no live/failed triggers simply shows no indicator.
export const WorkflowListPublicationStatusSchema = workflowPublicationStatusValueSchema.extract([
	'published',
	'partial',
	'failed',
]);

export type WorkflowListPublicationStatus = z.infer<typeof WorkflowListPublicationStatusSchema>;
