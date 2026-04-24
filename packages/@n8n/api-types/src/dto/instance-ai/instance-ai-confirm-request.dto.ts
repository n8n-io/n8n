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
	approved: z.literal(true),
	answers: z.array(
		z.object({
			questionId: z.string(),
			selectedOptions: z.array(z.string()),
			customText: z.string().optional(),
			skipped: z.boolean().optional(),
		}),
	),
});

/** Generic credential-setup submission: picks one credential per requested type. */
const credentialSelectionConfirmSchema = z.object({
	kind: z.literal('credentialSelection'),
	approved: z.literal(true),
	credentials: z.record(z.string()),
});

/** Domain-access gating decision. */
const domainAccessConfirmSchema = z.object({
	kind: z.literal('domainAccess'),
	approved: z.boolean(),
	domainAccessAction: domainAccessActionSchema.optional(),
});

/** Gateway resource-access decision (inputType='resource-decision'). */
const resourceDecisionConfirmSchema = z.object({
	kind: z.literal('resourceDecision'),
	approved: z.literal(true),
	resourceDecision: z.string(),
});

const nodeCredentialsRecord = z.record(z.record(z.string())).optional();
const nodeParametersRecord = z.record(z.record(z.unknown())).optional();

/** Workflow-setup wizard: apply the chosen credentials/parameters. */
const setupWorkflowApplyConfirmSchema = z.object({
	kind: z.literal('setupWorkflowApply'),
	approved: z.literal(true),
	action: z.literal('apply'),
	nodeCredentials: nodeCredentialsRecord,
	nodeParameters: nodeParametersRecord,
});

/** Workflow-setup wizard: run a test-trigger against a specific node. */
const setupWorkflowTestTriggerConfirmSchema = z.object({
	kind: z.literal('setupWorkflowTestTrigger'),
	approved: z.literal(true),
	action: z.literal('test-trigger'),
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
