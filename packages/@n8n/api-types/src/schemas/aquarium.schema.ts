import { z } from 'zod';

export const aquariumWorkflowActivitySchema = z.object({
	workflowId: z.string(),
	/** Runs that started and did not end yet. In queue mode this includes queued runs. */
	running: z.number(),
	/** Counts for the last `windowSeconds`. */
	started: z.number(),
	succeeded: z.number(),
	failed: z.number(),
	/** Starts in each full second of the window, oldest first. The current second is not in it. */
	startedPerSecond: z.array(z.number()),
	/** ISO timestamp of the last start or end. */
	lastEventAt: z.string(),
});
export type AquariumWorkflowActivity = z.infer<typeof aquariumWorkflowActivitySchema>;

export const aquariumActivitySchema = z.object({
	windowSeconds: z.number(),
	generatedAt: z.string(),
	workflows: z.array(aquariumWorkflowActivitySchema),
});
export type AquariumActivity = z.infer<typeof aquariumActivitySchema>;
