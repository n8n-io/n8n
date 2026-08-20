import { z } from 'zod';

import {
	domainAccessActionSchema,
	instanceAiApprovalResumeSchema,
	instanceGatewayResourceDecisionSchema,
	mcpConnectResumeSchema,
} from '../../schemas/instance-ai.schema';

/**
 * Plain approval/denial. Also carries optional `userInput` for:
 *   - text-input confirmations (inputType='text')
 *   - plan-review feedback accompanying approve/request-changes
 *   - deferring/skipping credential or workflow setup wizards (`approved: false`)
 *
 * Payload fields (minus `kind`) are shared with tool `.resume()` schemas via
 * `instanceAiApprovalResumeSchema` so wire/resume drift fails at typecheck.
 */
const approvalConfirmSchema = instanceAiApprovalResumeSchema.extend({
	kind: z.literal('approval'),
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

/** Map of credential type → credential ID (e.g. `{ slackApi: 'cred-1', githubApi: 'cred-2' }`). */
const credentialIdByTypeSchema = z.record(z.string());

const credentialSelectionConfirmSchema = z.object({
	kind: z.literal('credentialSelection'),
	credentials: credentialIdByTypeSchema,
});

const credentialAutoSetupConfirmSchema = z.object({
	kind: z.literal('credentialAutoSetup'),
	credentialType: z.string(),
	/** Client-generated id shared by the setup-choice telemetry events and the
	 *  terminal setup-completed event, so retries can be told apart in the funnel. */
	attemptId: z.string().trim().min(1).max(64).optional(),
});

/** Domain-access approval — `domainAccessAction` carries which scope the user picked. */
const domainAccessApproveSchema = z.object({
	kind: z.literal('domainAccessApprove'),
	domainAccessAction: domainAccessActionSchema,
});

/** Domain-access denial — no further input. */
const domainAccessDenySchema = z.object({
	kind: z.literal('domainAccessDeny'),
});

/** Plan-review denial — user rejected the proposed plan outright. Distinct from
 *  `approval` with `approved: false + userInput`, which asks the agent to revise. */
const planDenySchema = z.object({
	kind: z.literal('planDeny'),
});

/** Gateway resource-access decision (inputType='resource-decision'). Approval is implied. */
const resourceDecisionConfirmSchema = z.object({
	kind: z.literal('resourceDecision'),
	resourceDecision: instanceGatewayResourceDecisionSchema,
});

/** Per-node credential map: `Record<nodeName, Record<credentialType, credentialId>>`. */
const nodeCredentialsRecord = z.record(credentialIdByTypeSchema).optional();
/** Per-node parameter map: `Record<nodeName, Record<paramName, value>>`. */
const nodeParametersRecord = z.record(z.record(z.unknown())).optional();

/** Workflow-setup wizard: apply the chosen credentials/parameters. Approval is implied;
 *  the service maps this to `action: 'apply'` for the setup resume schema. */
const setupWorkflowApplyConfirmSchema = z.object({
	kind: z.literal('setupWorkflowApply'),
	nodeCredentials: nodeCredentialsRecord,
	nodeParameters: nodeParametersRecord,
	/** Nodes whose cards the user actively skipped in this panel. Without this the backend
	 *  can only see that they're still unconfigured, which reads as "ask again". */
	skippedNodes: z.array(z.string()).optional(),
});

/** Workflow-setup wizard: run a test-trigger against a specific node. Approval is implied;
 *  the service maps this to `action: 'test-trigger'` for the setup resume schema. */
const setupWorkflowTestTriggerConfirmSchema = z.object({
	kind: z.literal('setupWorkflowTestTrigger'),
	testTriggerNode: z.string(),
	nodeCredentials: nodeCredentialsRecord,
	nodeParameters: nodeParametersRecord,
});

const mcpConnectConfirmSchema = mcpConnectResumeSchema.extend({
	kind: z.literal('mcpConnect'),
});

export const InstanceAiConfirmRequestDto = z.discriminatedUnion('kind', [
	approvalConfirmSchema,
	questionsConfirmSchema,
	credentialSelectionConfirmSchema,
	credentialAutoSetupConfirmSchema,
	domainAccessApproveSchema,
	domainAccessDenySchema,
	planDenySchema,
	resourceDecisionConfirmSchema,
	setupWorkflowApplyConfirmSchema,
	setupWorkflowTestTriggerConfirmSchema,
	mcpConnectConfirmSchema,
]);

export type InstanceAiConfirmRequest = z.infer<typeof InstanceAiConfirmRequestDto>;
export type InstanceAiConfirmRequestKind = InstanceAiConfirmRequest['kind'];
export type InstanceAiResourceDecision = z.infer<typeof instanceGatewayResourceDecisionSchema>;
