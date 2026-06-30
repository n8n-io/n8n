import { z } from 'zod';

export const WorkflowPublicationStatusSchema = z.object({
	status: z.enum(['in_progress', 'published', 'partial', 'failed', 'not_published']),
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
