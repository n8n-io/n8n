/**
 * Zod schemas for the setup-workflow tool's suspend/resume contract.
 * Shared between the tool definition and the service layer.
 */
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import { z } from 'zod';

export const setupNodeSchema = z.object({
	node: z.object({
		name: z.string(),
		type: z.string(),
		typeVersion: z.number(),
		parameters: z.record(z.unknown()),
		credentials: z.record(z.object({ id: z.string(), name: z.string() })).optional(),
		position: z.tuple([z.number(), z.number()]),
		id: z.string(),
	}),
	credentialType: z.string().optional(),
	existingCredentials: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
	isTrigger: z.boolean(),
	isFirstTrigger: z.boolean().optional(),
	isTestable: z.boolean().optional(),
	isAutoApplied: z.boolean().optional(),
	credentialTestResult: z
		.object({
			success: z.boolean(),
			message: z.string().optional(),
		})
		.optional(),
	triggerTestResult: z
		.object({
			status: z.enum(['success', 'error', 'listening']),
			error: z.string().optional(),
		})
		.optional(),
	parameterIssues: z.record(z.array(z.string())).optional(),
	editableParameters: z
		.array(
			z.object({
				name: z.string(),
				displayName: z.string(),
				type: z.string(),
				required: z.boolean().optional(),
				default: z.unknown().optional(),
				options: z
					.array(
						z.object({
							name: z.string(),
							value: z.union([z.string(), z.number(), z.boolean()]),
						}),
					)
					.optional(),
			}),
		)
		.optional(),
});

export type SetupRequest = z.infer<typeof setupNodeSchema>;

export const setupSuspendSchema = z.object({
	requestId: z.string(),
	message: z.string(),
	severity: instanceAiConfirmationSeveritySchema,
	setupRequests: z.array(setupNodeSchema),
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
