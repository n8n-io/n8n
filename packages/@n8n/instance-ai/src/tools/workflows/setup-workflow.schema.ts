/**
 * Zod schemas for the setup-workflow tool's suspend/resume contract.
 * Shared between the tool definition and the service layer.
 *
 * The node schema is the canonical `workflowSetupNodeSchema` from @n8n/api-types.
 */
import {
	credentialDestinationDecisionSchema,
	instanceAiConfirmationSeveritySchema,
	workflowSetupNodeSchema,
	type InstanceAiWorkflowSetupNode,
} from '@n8n/api-types';
import { z } from 'zod';

export type SetupRequest = InstanceAiWorkflowSetupNode;

export const setupSuspendSchema = z.object({
	requestId: z.string(),
	message: z.string(),
	severity: instanceAiConfirmationSeveritySchema,
	setupRequests: z.array(workflowSetupNodeSchema),
	workflowId: z.string(),
	projectId: z.string().optional(),
	/** The turn's own report, rendered above the card. Without it a turn that both did
	 *  work and raised a card shows only the card's one-line message (INS-1265). */
	introMessage: z.string().optional(),
});

export const setupResumeSchema = z.object({
	approved: z.boolean(),
	credentialDestination: credentialDestinationDecisionSchema.optional(),
	action: z.enum(['apply', 'test-trigger']).optional(),
	credentials: z.record(z.record(z.string())).optional(),
	nodeParameters: z.record(z.record(z.unknown())).optional(),
	/** Node names whose cards the user actively skipped, so the tool can tell a declined
	 *  card apart from one that is merely still unconfigured. */
	skippedNodes: z.array(z.string()).optional(),
	testTriggerNode: z.string().optional(),
});
