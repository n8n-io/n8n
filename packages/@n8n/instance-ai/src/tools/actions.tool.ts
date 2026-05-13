/**
 * Consolidated Hub actions tool: search, describe, resolve, list credentials, execute.
 */
import { createTool } from '@mastra/core/tools';
import {
	hubActionExecutionPayloadSchema,
	instanceAiConfirmationSeveritySchema,
	type HubActionExecutionPayload,
	type HubActionParameterEntry,
} from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import type { InstanceAiContext } from '../types';

const searchAction = z.object({
	action: z.literal('search'),
	query: z.string().min(1),
	hasCredential: z.boolean().optional(),
});

const describeAction = z.object({
	action: z.literal('describe'),
	nodeId: z.string().min(1),
});

const resolveAction = z.object({
	action: z.literal('resolveAction'),
	actionId: z.string().min(1),
});

const listCredentialsAction = z.object({
	action: z.literal('list-credentials'),
	nodeType: z.string().optional(),
	actionId: z.string().optional(),
});

const executeAction = z.object({
	action: z.literal('execute'),
	id: z.string().min(1),
	params: z.record(z.unknown()).optional(),
	credentialId: z.string().optional(),
	dryRun: z.boolean().optional(),
});

const inputSchema = sanitizeInputSchema(
	z.discriminatedUnion('action', [
		searchAction,
		describeAction,
		resolveAction,
		listCredentialsAction,
		executeAction,
	]),
);

type Input = z.infer<typeof inputSchema>;
type ExecuteInput = Extract<Input, { action: 'execute' }>;

const suspendSchema = z.object({
	requestId: z.string(),
	message: z.string(),
	severity: instanceAiConfirmationSeveritySchema,
	hubActionExecution: hubActionExecutionPayloadSchema.optional(),
});

const resumeSchema = z.object({
	approved: z.boolean(),
});

type ResumeData = z.infer<typeof resumeSchema>;
type SuspendPayload = z.infer<typeof suspendSchema>;
type ToolExecutionContext = {
	agent?: {
		resumeData?: unknown;
		suspend?: unknown;
	};
};

const CONFIRMATION_PARAMETER_LIMIT = 3;
const CONFIRMATION_VALUE_LENGTH_LIMIT = 80;
const HIDDEN_CONFIRMATION_PARAMETERS = new Set([
	'authentication',
	'nodeCredentialType',
	'genericAuthType',
	'curlImport',
	'resource',
	'operation',
]);
const SENSITIVE_CONFIRMATION_PARAMETER_PATTERN =
	/(password|secret|token|authorization|credential|apiKey|api_key|accessKey|privateKey)/i;

function isSuspendFn(value: unknown): value is (payload: SuspendPayload) => Promise<void> {
	return typeof value === 'function';
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function getResumeData(value: unknown): ResumeData | undefined {
	const parsed = resumeSchema.safeParse(value);
	return parsed.success ? parsed.data : undefined;
}

function deniedResult(reason: string) {
	return {
		executionId: '',
		status: 'error',
		denied: true,
		reason,
	};
}

function executionErrorResult(error: unknown) {
	return {
		executionId: '',
		status: 'error',
		error: error instanceof Error ? error.message : 'Action execution failed',
	};
}

async function executeActionRequest(context: InstanceAiContext, input: ExecuteInput) {
	try {
		return await context.actionService.execute(toExecuteRequest(input));
	} catch (error) {
		return executionErrorResult(error);
	}
}

function toExecuteRequest(input: ExecuteInput) {
	return {
		id: input.id,
		params: input.params,
		credentialId: input.credentialId,
		dryRun: input.dryRun,
	};
}

function getSchemaPropertyTitle(
	inputSchema: ExecuteInput['params'],
	key: string,
): string | undefined {
	if (!isRecord(inputSchema)) return undefined;
	const properties = inputSchema.properties;
	if (!isRecord(properties)) return undefined;
	const property = properties[key];
	if (!isRecord(property)) return undefined;
	return typeof property.title === 'string' ? property.title : undefined;
}

function humanizeParameterName(key: string): string {
	return key
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replace(/[_-]+/g, ' ')
		.toLowerCase();
}

function sentenceCaseParameterName(label: string): string {
	if (label.length < 2) return label.toLowerCase();
	if (label[0] === label[0].toUpperCase() && label[1] === label[1].toUpperCase()) return label;
	return label[0].toLowerCase() + label.slice(1);
}

function titleCaseParameterName(label: string): string {
	return label.replace(/\b\w/g, (c) => c.toUpperCase());
}

function resolveRawParameterLabel(
	key: string,
	inputSchema?: { properties: Record<string, unknown> },
): string {
	return getSchemaPropertyTitle(inputSchema, key) ?? humanizeParameterName(key);
}

function filterVisibleParamEntries(params: ExecuteInput['params']): Array<[string, unknown]> {
	if (!params) return [];
	return Object.entries(params).filter(([key, value]) => {
		if (value === undefined) return false;
		if (HIDDEN_CONFIRMATION_PARAMETERS.has(key)) return false;
		return !SENSITIVE_CONFIRMATION_PARAMETER_PATTERN.test(key);
	});
}

function formatParameterValue(value: unknown): string {
	if (typeof value === 'string') {
		const normalized = value.replace(/\s+/g, ' ').trim();
		const truncated =
			normalized.length > CONFIRMATION_VALUE_LENGTH_LIMIT
				? `${normalized.slice(0, CONFIRMATION_VALUE_LENGTH_LIMIT)}...`
				: normalized;
		return `"${truncated.replace(/"/g, '\\"')}"`;
	}
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	if (value === null) return 'null';
	if (Array.isArray(value)) return `${value.length} ${value.length === 1 ? 'item' : 'items'}`;
	if (isRecord(value)) return 'custom values';
	if (typeof value === 'bigint') return value.toString();
	return 'custom value';
}

function joinParameterParts(parts: string[]): string {
	if (parts.length <= 1) return parts[0] ?? '';
	if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
	return `${parts.slice(0, -1).join(', ')}, and ${parts.at(-1)}`;
}

function buildParameterEntries(
	params: ExecuteInput['params'],
	inputSchema?: { properties: Record<string, unknown> },
): HubActionParameterEntry[] {
	return filterVisibleParamEntries(params).map(([key, value]) => ({
		label: titleCaseParameterName(resolveRawParameterLabel(key, inputSchema)),
		value: formatParameterValue(value),
	}));
}

function formatParameterSummary(
	params: ExecuteInput['params'],
	inputSchema?: { properties: Record<string, unknown> },
): string | undefined {
	const visibleEntries = filterVisibleParamEntries(params);
	if (visibleEntries.length === 0) return undefined;

	const parameterParts = visibleEntries
		.slice(0, CONFIRMATION_PARAMETER_LIMIT)
		.map(([key, value]) => {
			const label = sentenceCaseParameterName(resolveRawParameterLabel(key, inputSchema));
			return `${label}: ${formatParameterValue(value)}`;
		});

	const remainingCount = visibleEntries.length - parameterParts.length;
	if (remainingCount > 0) {
		parameterParts.push(`${remainingCount} more`);
	}

	return joinParameterParts(parameterParts);
}

interface ResolvedActionContext {
	actionLabel: string;
	credentialLabel?: string;
	parameterSummary?: string;
	hubActionExecution?: HubActionExecutionPayload;
}

async function resolveActionLabel(
	context: InstanceAiContext,
	input: ExecuteInput,
): Promise<ResolvedActionContext> {
	const descriptor = await context.actionService.resolveAction(input.id).catch(() => null);
	const actionLabel = descriptor?.displayName ?? input.id;
	const parameterEntries = buildParameterEntries(input.params, descriptor?.inputSchema);
	const parameterSummary = formatParameterSummary(input.params, descriptor?.inputSchema);

	let credentialLabel: string | undefined;
	let credentialReference: HubActionExecutionPayload['credential'];
	if (input.credentialId) {
		const { credentials } = await context.actionService
			.listCredentials({ actionId: input.id })
			.catch(() => ({ credentials: [] }));
		const match = credentials.find((credential) => credential.id === input.credentialId);
		credentialLabel = match?.name ?? input.credentialId;
		credentialReference = {
			id: input.credentialId,
			name: match?.name ?? input.credentialId,
			...(match?.type ? { type: match.type } : {}),
		};
	}

	const hubActionExecution: HubActionExecutionPayload | undefined = descriptor
		? {
				actionId: input.id,
				nodeType: descriptor.nodeId,
				actionDisplayName: descriptor.displayName,
				nodeDisplayName: descriptor.nodeDisplayName,
				...(descriptor.operationDisplayName
					? { operationDisplayName: descriptor.operationDisplayName }
					: {}),
				parameters: parameterEntries,
				...(credentialReference ? { credential: credentialReference } : {}),
			}
		: undefined;

	return {
		actionLabel,
		credentialLabel,
		parameterSummary,
		hubActionExecution,
	};
}

async function handleExecute(
	context: InstanceAiContext,
	input: ExecuteInput,
	ctx: ToolExecutionContext,
) {
	if (input.dryRun === true) {
		return await executeActionRequest(context, input);
	}

	if (context.permissions?.runWorkflow === 'blocked') {
		return deniedResult('Action blocked by admin');
	}

	const rawResumeData = ctx.agent?.resumeData;
	const hasResumeData = rawResumeData !== undefined && rawResumeData !== null;
	const resumeData = getResumeData(rawResumeData);

	if (hasResumeData) {
		if (resumeData?.approved) {
			return await executeActionRequest(context, input);
		}

		return deniedResult('User denied the action');
	}

	if (context.permissions?.runWorkflow !== 'always_allow') {
		const { actionLabel, credentialLabel, parameterSummary, hubActionExecution } =
			await resolveActionLabel(context, input);
		const credentialSummary = credentialLabel ? ` using credential "${credentialLabel}"` : '';
		const parameterMessage = parameterSummary ? ` with ${parameterSummary}` : '';
		const message = `Execute ${actionLabel}${credentialSummary}${parameterMessage}?`;
		const suspend = ctx.agent?.suspend;

		if (isSuspendFn(suspend)) {
			await suspend({
				requestId: nanoid(),
				message,
				severity: 'warning',
				...(hubActionExecution ? { hubActionExecution } : {}),
			});
		}

		return deniedResult('Awaiting confirmation');
	}

	return await executeActionRequest(context, input);
}

export function createActionsTool(context: InstanceAiContext) {
	return createTool({
		id: 'actions',
		description:
			'Search, inspect, and execute n8n Hub single-node actions using existing credentials.',
		inputSchema,
		suspendSchema,
		resumeSchema,
		execute: async (input: Input, ctx?: ToolExecutionContext) => {
			switch (input.action) {
				case 'search':
					return await context.actionService.search({
						query: input.query,
						hasCredential: input.hasCredential,
					});
				case 'describe':
					return await context.actionService.describe(input.nodeId);
				case 'resolveAction':
					return await context.actionService.resolveAction(input.actionId);
				case 'list-credentials':
					return await context.actionService.listCredentials({
						nodeType: input.nodeType,
						actionId: input.actionId,
					});
				case 'execute':
					return await handleExecute(context, input, ctx ?? {});
			}
		},
	});
}
