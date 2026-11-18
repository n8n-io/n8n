import { z } from 'zod';

export const aquariumWorkflowActivitySchema = z.object({
	workflowId: z.string(),
	/** Runs that started and did not end yet. In queue mode this includes queued runs. */
	running: z.number(),
	/** Counts for the last `windowSeconds`. */
	started: z.number(),
	succeeded: z.number(),
	failed: z.number(),
	/** Runs that are paused now, waiting to go on (Wait node, form, approval). Not a failure. */
	waiting: z.number(),
	/** Pauses in the window. */
	paused: z.number(),
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

export const aquariumSecurityRiskSchema = z.enum([
	/** A published Webhook node with no authentication and no validating node after it. */
	'unprotectedWebhook',
	/** An expression in the query of a SQL "Execute Query" operation. */
	'sqlExpression',
	/** An Execute Command or SSH node. */
	'shellAccess',
]);
export type AquariumSecurityRisk = z.infer<typeof aquariumSecurityRiskSchema>;

export const aquariumWorkflowSecuritySchema = z.object({
	workflowId: z.string(),
	/** Each risk once, however many nodes have it. */
	risks: z.array(aquariumSecurityRiskSchema),
});
export type AquariumWorkflowSecurity = z.infer<typeof aquariumWorkflowSecuritySchema>;

export const aquariumSecuritySchema = z.object({
	/** Only the workflows with one or more risks. */
	workflows: z.array(aquariumWorkflowSecuritySchema),
});
export type AquariumSecurity = z.infer<typeof aquariumSecuritySchema>;
