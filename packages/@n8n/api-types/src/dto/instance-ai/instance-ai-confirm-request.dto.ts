import { z } from 'zod';

import { domainAccessActionSchema } from '../../schemas/instance-ai.schema';

/**
 * Plain approval/denial. Also carries optional `userInput` for:
 *   - text-input confirmations (inputType='text')
 *   - plan-review feedback accompanying approve/request-changes
 *   - deferring/skipping credential or workflow setup wizards (`approved: false`)
 */
const approvalConfirmSchema = z.object({
	kind: z.literal('approval'),
	approved: z.boolean(),
	userInput: z.string().optional(),
});

/** Q&A wizard submission (inputType='questions'). */
const questionsConfirmSchema = z.object({
	kind: z.literal('questions'),
	answers: z.array(
		z.object({
			questionId: z.string(),
			selectedOptions: z.array(z.string()),
			customText: z.string().optional(),
			skipped: z.boolean().optional(),
		}),
	),
});

const credentialSelectionConfirmSchema = z.object({
	kind: z.literal('credentialSelection'),
	credentials: z.record(z.string()),
});

const domainAccessConfirmSchema = z.object({
	kind: z.literal('domainAccess'),
	approved: z.boolean(),
	domainAccessAction: domainAccessActionSchema.optional(),
});

/** Gateway resource-access decision (inputType='resource-decision'). Approval is implied. */
const resourceDecisionConfirmSchema = z.object({
	kind: z.literal('resourceDecision'),
	resourceDecision: z.string(),
});

const nodeCredentialsRecord = z.record(z.record(z.string())).optional();
const nodeParametersRecord = z.record(z.record(z.unknown())).optional();

/** Workflow-setup wizard: apply the chosen credentials/parameters. Approval is implied;
 *  the service maps this to `action: 'apply'` for the underlying Mastra resume schema. */
const setupWorkflowApplyConfirmSchema = z.object({
	kind: z.literal('setupWorkflowApply'),
	nodeCredentials: nodeCredentialsRecord,
	nodeParameters: nodeParametersRecord,
});

/** Workflow-setup wizard: run a test-trigger against a specific node. Approval is implied;
 *  the service maps this to `action: 'test-trigger'` for the underlying Mastra resume schema. */
const setupWorkflowTestTriggerConfirmSchema = z.object({
	kind: z.literal('setupWorkflowTestTrigger'),
	testTriggerNode: z.string(),
	nodeCredentials: nodeCredentialsRecord,
	nodeParameters: nodeParametersRecord,
});

export const InstanceAiConfirmRequestDto = z.discriminatedUnion('kind', [
	approvalConfirmSchema,
	questionsConfirmSchema,
	credentialSelectionConfirmSchema,
	domainAccessConfirmSchema,
	resourceDecisionConfirmSchema,
	setupWorkflowApplyConfirmSchema,
	setupWorkflowTestTriggerConfirmSchema,
]);

export type InstanceAiConfirmRequest = z.infer<typeof InstanceAiConfirmRequestDto>;
export type InstanceAiConfirmRequestKind = InstanceAiConfirmRequest['kind'];
