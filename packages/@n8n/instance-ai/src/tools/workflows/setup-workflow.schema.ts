/**
 * Zod schemas for the setup-workflow tool's suspend/resume contract.
 * Shared between the tool definition and the service layer.
 *
 * The node schema is the canonical `workflowSetupNodeSchema` from @n8n/api-types.
 */
import {
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
});

export const setupResumeSchema = z.object({
	approved: z.boolean(),
	action: z.enum(['apply', 'test-trigger']).optional(),
	credentials: z.record(z.record(z.string())).optional(),
	nodeParameters: z.record(z.record(z.unknown())).optional(),
	testTriggerNode: z.string().optional(),
});
