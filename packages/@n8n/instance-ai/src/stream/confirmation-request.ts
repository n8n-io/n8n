import {
	credentialRequestSchema,
	gatewayConfirmationRequiredPayloadSchema,
	instanceAiConfirmationSeveritySchema,
	plannedTaskArgSchema,
	taskListSchema,
	webSearchMetaSchema,
	workflowSetupNodeSchema,
} from '@n8n/api-types';
import type { InstanceAiConfirmation, InstanceAiConfirmationRequestPayload } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { z } from 'zod';

const questionItemSchema = z.object({
	id: z.string(),
	question: z.string(),
	type: z.enum(['single', 'multi', 'text']),
	options: z.array(z.string()).optional(),
});

const confirmationInputTypeSchema = z.enum([
	'approval',
	'text',
	'questions',
	'plan-review',
	'resource-decision',
	'continue',
]);

const credentialFlowSchema = z.object({ stage: z.enum(['generic', 'finalize']) });

const domainAccessSchema = z.object({ url: z.string(), host: z.string() });

export interface SuspendedToolCallConfirmationInput {
	toolCallId: unknown;
	toolName: unknown;
	input?: unknown;
	suspendPayload?: unknown;
}

export interface ParsedSuspendedConfirmation {
	payload: InstanceAiConfirmationRequestPayload;
	confirmation: InstanceAiConfirmation;
}

function presentString(value: unknown): string | undefined {
	return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function parseSchemaArray<T>(value: unknown, schema: z.ZodType<T>): T[] | undefined {
	if (!Array.isArray(value)) return undefined;
	const parsed = value
		.map((item) => schema.safeParse(item))
		.filter((result) => result.success)
		.map((result) => result.data);

	return parsed.length > 0 ? parsed : undefined;
}

function parseSchemaRecord<T>(value: unknown, schema: z.ZodType<T>): T | undefined {
	const parsed = schema.safeParse(value);
	return parsed.success ? parsed.data : undefined;
}

function setIfDefined<T, K extends keyof T>(target: T, key: K, value: T[K] | undefined): void {
	if (value !== undefined) target[key] = value;
}

function toConfirmation(payload: InstanceAiConfirmationRequestPayload): InstanceAiConfirmation {
	const confirmation: InstanceAiConfirmation = {
		requestId: payload.requestId,
		severity: payload.severity,
		message: payload.message,
	};
	setIfDefined(confirmation, 'inputThreadId', payload.inputThreadId);
	setIfDefined(confirmation, 'credentialRequests', payload.credentialRequests);
	setIfDefined(confirmation, 'projectId', payload.projectId);
	setIfDefined(confirmation, 'inputType', payload.inputType);
	setIfDefined(confirmation, 'questions', payload.questions);
	setIfDefined(confirmation, 'introMessage', payload.introMessage);
	setIfDefined(confirmation, 'tasks', payload.tasks);
	setIfDefined(confirmation, 'planItems', payload.planItems);
	setIfDefined(confirmation, 'domainAccess', payload.domainAccess);
	setIfDefined(confirmation, 'webSearch', payload.webSearch);
	setIfDefined(confirmation, 'credentialFlow', payload.credentialFlow);
	setIfDefined(confirmation, 'setupRequests', payload.setupRequests);
	setIfDefined(confirmation, 'workflowId', payload.workflowId);
	setIfDefined(confirmation, 'resourceDecision', payload.resourceDecision);

	return confirmation;
}

export function parseSuspendedToolCallConfirmation(
	input: SuspendedToolCallConfirmationInput,
): ParsedSuspendedConfirmation | undefined {
	const toolCallId = presentString(input.toolCallId);
	if (!toolCallId) return undefined;

	const suspendPayload = isRecord(input.suspendPayload) ? input.suspendPayload : {};
	const requestId = presentString(suspendPayload.requestId) ?? toolCallId;
	if (!requestId) return undefined;

	const severity = instanceAiConfirmationSeveritySchema.safeParse(suspendPayload.severity);
	const payload: InstanceAiConfirmationRequestPayload = {
		requestId,
		toolCallId,
		toolName: presentString(input.toolName) ?? '',
		args: isRecord(input.input) ? input.input : {},
		severity: severity.success ? severity.data : 'info',
		message: presentString(suspendPayload.message) ?? 'Confirmation required',
	};

	setIfDefined(payload, 'inputThreadId', presentString(suspendPayload.inputThreadId));
	setIfDefined(
		payload,
		'credentialRequests',
		parseSchemaArray(suspendPayload.credentialRequests, credentialRequestSchema),
	);
	setIfDefined(payload, 'projectId', presentString(suspendPayload.projectId));
	setIfDefined(
		payload,
		'inputType',
		parseSchemaRecord(suspendPayload.inputType, confirmationInputTypeSchema),
	);
	setIfDefined(
		payload,
		'questions',
		parseSchemaArray(suspendPayload.questions, questionItemSchema),
	);
	setIfDefined(payload, 'introMessage', presentString(suspendPayload.introMessage));
	setIfDefined(payload, 'tasks', parseSchemaRecord(suspendPayload.tasks, taskListSchema));
	setIfDefined(
		payload,
		'planItems',
		parseSchemaArray(suspendPayload.planItems, plannedTaskArgSchema),
	);
	setIfDefined(
		payload,
		'domainAccess',
		parseSchemaRecord(suspendPayload.domainAccess, domainAccessSchema),
	);
	setIfDefined(
		payload,
		'webSearch',
		parseSchemaRecord(suspendPayload.webSearch, webSearchMetaSchema),
	);
	setIfDefined(
		payload,
		'credentialFlow',
		parseSchemaRecord(suspendPayload.credentialFlow, credentialFlowSchema),
	);
	setIfDefined(
		payload,
		'setupRequests',
		parseSchemaArray(suspendPayload.setupRequests, workflowSetupNodeSchema),
	);
	setIfDefined(payload, 'workflowId', presentString(suspendPayload.workflowId));
	setIfDefined(
		payload,
		'resourceDecision',
		parseSchemaRecord(suspendPayload.resourceDecision, gatewayConfirmationRequiredPayloadSchema),
	);

	return { payload, confirmation: toConfirmation(payload) };
}
