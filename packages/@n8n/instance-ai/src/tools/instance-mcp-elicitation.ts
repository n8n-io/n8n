/**
 * How the Assistant answers an `input_required` result of the instance MCP
 * server (protocol revision 2026-07-28): the run suspends on a card, and the
 * resumed call retries the same request with the answer and the echoed state.
 */
import {
	buildWorkflowActionSessionGrantKey,
	instanceAiApprovalDetailsSchema,
	instanceAiApprovalResumeSchema,
	instanceAiConfirmationSeveritySchema,
	type InstanceAiApprovalDetails,
	type InstanceAiPermissions,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { askUserResumeSchema } from './shared/ask-user.tool';
import type { InstanceAiContext, InstanceMcpInputRequiredResult } from '../types';

/** The `_meta` key the server puts on an elicit request that is an approval. */
export const INSTANCE_MCP_APPROVAL_META_KEY = 'n8n/approval';

const approvalMetaSchema = z.object({
	approvalDetails: instanceAiApprovalDetailsSchema,
	resourceName: z.string().optional(),
	severity: instanceAiConfirmationSeveritySchema,
});

const questionSchema = z.object({
	id: z.string(),
	question: z.string(),
	type: z.enum(['single', 'multi', 'text']),
	options: z.array(z.string()).optional(),
	required: z.boolean().optional(),
});

/** An approval card, or a questions card for a form the server defines. */
export const elicitationSuspendSchema = z.union([
	z.object({
		requestId: z.string(),
		message: z.string(),
		severity: instanceAiConfirmationSeveritySchema,
		approvalDetails: instanceAiApprovalDetailsSchema.optional(),
		resourceName: z.string().optional(),
	}),
	z.object({
		requestId: z.string(),
		message: z.string(),
		severity: z.literal('info'),
		inputType: z.literal('questions'),
		questions: z.array(questionSchema),
		introMessage: z.string().optional(),
	}),
]);

export const elicitationResumeSchema = z.union([
	instanceAiApprovalResumeSchema,
	askUserResumeSchema,
]);

export type ElicitationSuspendPayload = z.infer<typeof elicitationSuspendSchema>;
export type ElicitationResumeData = z.infer<typeof elicitationResumeSchema>;

/** Private state the tool keeps across the suspension: which request it answers, and the server's state. */
const continuationSchema = z.object({
	key: z.string(),
	requestState: z.string().optional(),
	kind: z.enum(['approval', 'form']),
	grantKey: z.string().optional(),
	/** Form properties by name, to turn answers back into typed content. */
	properties: z.record(z.object({ type: z.string() })).optional(),
});

export type ElicitationContinuation = z.infer<typeof continuationSchema>;

export function readContinuation(value: unknown): ElicitationContinuation | undefined {
	const parsed = continuationSchema.safeParse(value);
	return parsed.success ? parsed.data : undefined;
}

export interface Elicitation {
	key: string;
	message: string;
	requestedSchema: { properties: Record<string, Record<string, unknown>>; required?: string[] };
	approval?: z.infer<typeof approvalMetaSchema>;
}

/** Reads the one form elicitation of an `input_required` result, or nothing when it asks for something else. */
export function readElicitation(result: InstanceMcpInputRequiredResult): Elicitation | undefined {
	for (const [key, request] of Object.entries(result.inputRequests ?? {})) {
		if (request.method !== 'elicitation/create') continue;
		const params = request.params;
		if (!params || typeof params.message !== 'string') continue;
		const requestedSchema = isRecord(params.requestedSchema) ? params.requestedSchema : undefined;
		const rawProperties = requestedSchema?.properties;
		const properties: Record<string, Record<string, unknown>> = {};
		if (isRecord(rawProperties)) {
			for (const [name, definition] of Object.entries(rawProperties)) {
				if (isRecord(definition)) properties[name] = definition;
			}
		}
		const required = Array.isArray(requestedSchema?.required)
			? requestedSchema.required.filter((name): name is string => typeof name === 'string')
			: undefined;
		const meta = isRecord(params._meta) ? params._meta[INSTANCE_MCP_APPROVAL_META_KEY] : undefined;
		const approval = approvalMetaSchema.safeParse(meta);
		return {
			key,
			message: params.message,
			requestedSchema: { properties, ...(required ? { required } : {}) },
			...(approval.success ? { approval: approval.data } : {}),
		};
	}
	return undefined;
}

// ── Approval policy (client side) ───────────────────────────────────────────

type ApprovalPolicy = { permission: keyof InstanceAiPermissions; grant: string };

/** Which admin rule and "Always allow" grant govern an approval, by what it does. */
const APPROVAL_POLICY: Partial<Record<InstanceAiApprovalDetails['action'], ApprovalPolicy>> = {
	'publish-workflow': { permission: 'publishWorkflow', grant: 'publish' },
	'unpublish-workflow': { permission: 'publishWorkflow', grant: 'unpublish' },
	'archive-workflow': { permission: 'deleteWorkflow', grant: 'delete' },
	'restore-version': { permission: 'restoreWorkflowVersion', grant: 'restore-version' },
	'edit-workflow': { permission: 'updateWorkflow', grant: 'update' },
};

export type ApprovalDecision = 'blocked' | 'allowed' | 'ask';

export function resolveApprovalPolicy(
	context: InstanceAiContext,
	approval: NonNullable<Elicitation['approval']>,
	input: unknown,
	toolName: string,
): { decision: ApprovalDecision; grantKey: string } {
	const policy = APPROVAL_POLICY[approval.approvalDetails.action];
	const workflowId =
		isRecord(input) && typeof input.workflowId === 'string' ? input.workflowId : '';
	const grantKey =
		policy && workflowId
			? buildWorkflowActionSessionGrantKey(policy.grant, workflowId)
			: `instance-mcp:${toolName}:${workflowId}`;
	const mode = policy ? context.permissions?.[policy.permission] : undefined;
	if (mode === 'blocked') return { decision: 'blocked', grantKey };
	if (mode === 'always_allow' || context.sessionApprovedToolKeys?.has(grantKey) === true) {
		return { decision: 'allowed', grantKey };
	}
	return { decision: 'ask', grantKey };
}

// ── Suspend payloads ────────────────────────────────────────────────────────

export function approvalSuspendPayload(elicitation: Elicitation): ElicitationSuspendPayload {
	const approval = elicitation.approval;
	return {
		requestId: nanoid(),
		message: elicitation.message,
		severity: approval?.severity ?? 'warning',
		...(approval ? { approvalDetails: approval.approvalDetails } : {}),
		...(approval?.resourceName ? { resourceName: approval.resourceName } : {}),
	};
}

/** A server-defined form as the Assistant's questions card: enums and booleans pick, the rest types. */
export function formSuspendPayload(elicitation: Elicitation): ElicitationSuspendPayload {
	const questions = Object.entries(elicitation.requestedSchema.properties).map(
		([name, definition]) => {
			const title = typeof definition.title === 'string' ? definition.title : name;
			const description =
				typeof definition.description === 'string' ? ` ${definition.description}` : '';
			const required = elicitation.requestedSchema.required?.includes(name) === true;
			const options = Array.isArray(definition.enum)
				? definition.enum.filter((option): option is string => typeof option === 'string')
				: undefined;
			if (options && options.length > 0) {
				return {
					id: name,
					question: `${title}.${description}`,
					type: 'single' as const,
					options,
					required,
				};
			}
			if (definition.type === 'boolean') {
				return {
					id: name,
					question: `${title}.${description}`,
					type: 'single' as const,
					options: ['Yes', 'No'],
					required,
				};
			}
			return { id: name, question: `${title}.${description}`, type: 'text' as const, required };
		},
	);
	return {
		requestId: nanoid(),
		message: elicitation.message,
		severity: 'info',
		inputType: 'questions',
		questions,
		introMessage: elicitation.message,
	};
}

export function formContinuation(
	elicitation: Elicitation,
	kind: ElicitationContinuation['kind'],
	requestState: string | undefined,
	grantKey?: string,
): ElicitationContinuation {
	const properties: Record<string, { type: string }> = {};
	for (const [name, definition] of Object.entries(elicitation.requestedSchema.properties)) {
		properties[name] = { type: typeof definition.type === 'string' ? definition.type : 'string' };
	}
	return {
		key: elicitation.key,
		kind,
		...(requestState !== undefined ? { requestState } : {}),
		...(grantKey ? { grantKey } : {}),
		properties,
	};
}

// ── Resume → elicit result ──────────────────────────────────────────────────

export type ElicitResult =
	| { action: 'accept'; content: Record<string, string | number | boolean | string[]> }
	| { action: 'decline' }
	| { action: 'cancel' };

/** Turns the card's answer into the elicitation result the server reads on the retry. */
export function toElicitResult(
	continuation: ElicitationContinuation,
	resumeData: ElicitationResumeData,
): ElicitResult {
	if (continuation.kind === 'approval') {
		return resumeData.approved === true
			? { action: 'accept', content: { confirm: true } }
			: { action: 'decline' };
	}
	if (resumeData.approved === false) return { action: 'decline' };
	const answers = 'answers' in resumeData ? (resumeData.answers ?? []) : [];
	if (answers.length === 0 || answers.every((answer) => answer.skipped === true)) {
		return { action: 'cancel' };
	}
	const content: Record<string, string | number | boolean | string[]> = {};
	for (const answer of answers) {
		if (answer.skipped) continue;
		const type = continuation.properties?.[answer.questionId]?.type ?? 'string';
		const picked = answer.customText ?? answer.selectedOptions[0];
		if (picked === undefined) continue;
		if (type === 'boolean') content[answer.questionId] = picked === 'Yes';
		else if (type === 'number' || type === 'integer') {
			const parsed = Number(picked);
			if (!Number.isNaN(parsed)) content[answer.questionId] = parsed;
		} else content[answer.questionId] = picked;
	}
	return { action: 'accept', content };
}
