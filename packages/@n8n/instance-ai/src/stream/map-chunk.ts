import type { StreamChunk } from '@n8n/agents';
import {
	credentialRequestSchema,
	workflowSetupNodeSchema,
	taskListSchema,
	plannedTaskArgSchema,
	gatewayConfirmationRequiredPayloadSchema,
} from '@n8n/api-types';
import type {
	InstanceAiCredentialRequest,
	InstanceAiEvent,
	InstanceAiWorkflowSetupNode,
	PlannedTaskArg,
	TaskList,
	GatewayConfirmationRequiredPayload,
} from '@n8n/api-types';
import { z } from 'zod';

const questionItemSchema = z.object({
	id: z.string(),
	question: z.string(),
	type: z.enum(['single', 'multi', 'text']),
	options: z.array(z.string()).optional(),
});

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

const agentStreamChunkTypes = new Set<string>([
	'finish',
	'text-delta',
	'reasoning-delta',
	'tool-call-delta',
	'error',
	'message',
	'tool-call-suspended',
]);

function isAgentStreamChunk(value: unknown): value is StreamChunk {
	return isRecord(value) && typeof value.type === 'string' && agentStreamChunkTypes.has(value.type);
}

interface ErrorInfo {
	content: string;
	statusCode?: number;
	provider?: string;
	technicalDetails?: string;
}

function extractErrorInfo(error: unknown): ErrorInfo {
	if (typeof error === 'string') return { content: error };

	if (error instanceof Error) {
		const info: ErrorInfo = { content: error.message };

		// APICallError from ai-sdk carries statusCode and responseBody
		if ('statusCode' in error && typeof error.statusCode === 'number') {
			info.statusCode = error.statusCode;
		}

		if ('responseBody' in error && typeof error.responseBody === 'string') {
			info.technicalDetails = error.responseBody;
			try {
				const body = JSON.parse(error.responseBody) as {
					error?: { message?: string; type?: string };
				};
				if (body?.error?.message) {
					info.content = body.error.message;
				}
			} catch {
				// not JSON — keep raw responseBody as technicalDetails
			}
		}

		// Extract provider from error name or URL if available
		if ('url' in error && typeof error.url === 'string') {
			const urlStr = error.url;
			if (urlStr.includes('anthropic')) info.provider = 'Anthropic';
			else if (urlStr.includes('openai')) info.provider = 'OpenAI';
		}

		return info;
	}

	return { content: 'Unknown error' };
}

export function mapAgentChunkToEvent(
	runId: string,
	agentId: string,
	chunk: unknown,
	responseId?: string,
): InstanceAiEvent | null {
	if (!isAgentStreamChunk(chunk)) return null;

	const base = { runId, agentId, ...(responseId ? { responseId } : {}) };

	if (chunk.type === 'text-delta') {
		return {
			type: 'text-delta',
			...base,
			payload: { text: chunk.delta },
		};
	}

	if (chunk.type === 'reasoning-delta') {
		return {
			type: 'reasoning-delta',
			...base,
			payload: { text: chunk.delta },
		};
	}

	if (chunk.type === 'tool-call-suspended') {
		const suspendPayload = isRecord(chunk.suspendPayload) ? chunk.suspendPayload : {};
		const toolCallId = typeof chunk.toolCallId === 'string' ? chunk.toolCallId : '';

		const requestId =
			typeof suspendPayload.requestId === 'string' && suspendPayload.requestId
				? suspendPayload.requestId
				: toolCallId;

		if (!requestId || !toolCallId) return null;

		const rawSeverity = typeof suspendPayload.severity === 'string' ? suspendPayload.severity : '';
		const validSeverities = ['destructive', 'warning', 'info'] as const;
		const severity = (validSeverities as readonly string[]).includes(rawSeverity)
			? (rawSeverity as (typeof validSeverities)[number])
			: 'warning';

		let credentialRequests: InstanceAiCredentialRequest[] | undefined;
		if (Array.isArray(suspendPayload.credentialRequests)) {
			const parsed = suspendPayload.credentialRequests
				.map((item) => credentialRequestSchema.safeParse(item))
				.filter((r) => r.success)
				.map((r) => r.data);
			if (parsed.length > 0) {
				credentialRequests = parsed;
			}
		}

		const projectId =
			typeof suspendPayload.projectId === 'string' ? suspendPayload.projectId : undefined;

		const rawInputType =
			typeof suspendPayload.inputType === 'string' ? suspendPayload.inputType : undefined;
		const validInputTypes = [
			'approval',
			'text',
			'questions',
			'plan-review',
			'resource-decision',
		] as const;
		const inputType = (validInputTypes as readonly string[]).includes(rawInputType ?? '')
			? (rawInputType as (typeof validInputTypes)[number])
			: undefined;

		let questions: Array<z.infer<typeof questionItemSchema>> | undefined;
		if (Array.isArray(suspendPayload.questions)) {
			const parsed = suspendPayload.questions
				.map((item) => questionItemSchema.safeParse(item))
				.filter((r) => r.success)
				.map((r) => r.data);
			if (parsed.length > 0) {
				questions = parsed;
			}
		}

		const introMessage =
			typeof suspendPayload.introMessage === 'string' ? suspendPayload.introMessage : undefined;

		let tasks: TaskList | undefined;
		if (isRecord(suspendPayload.tasks)) {
			const parsed = taskListSchema.safeParse(suspendPayload.tasks);
			if (parsed.success) {
				tasks = parsed.data;
			}
		}

		let planItems: PlannedTaskArg[] | undefined;
		if (Array.isArray(suspendPayload.planItems)) {
			const parsed = suspendPayload.planItems
				.map((item) => plannedTaskArgSchema.safeParse(item))
				.filter((r) => r.success)
				.map((r) => r.data);
			if (parsed.length > 0) {
				planItems = parsed;
			}
		}

		const rawDomainAccess = isRecord(suspendPayload.domainAccess)
			? suspendPayload.domainAccess
			: undefined;
		const domainAccess =
			rawDomainAccess &&
			typeof rawDomainAccess.url === 'string' &&
			typeof rawDomainAccess.host === 'string'
				? { url: rawDomainAccess.url, host: rawDomainAccess.host }
				: undefined;

		const rawCredentialFlow = isRecord(suspendPayload.credentialFlow)
			? suspendPayload.credentialFlow
			: undefined;
		const validStages = new Set<'generic' | 'finalize'>(['generic', 'finalize']);
		const rawStage =
			rawCredentialFlow && typeof rawCredentialFlow.stage === 'string'
				? rawCredentialFlow.stage
				: undefined;
		const credentialFlow =
			rawStage !== undefined && validStages.has(rawStage as 'generic' | 'finalize')
				? { stage: rawStage as 'generic' | 'finalize' }
				: undefined;

		let setupRequests: InstanceAiWorkflowSetupNode[] | undefined;
		if (Array.isArray(suspendPayload.setupRequests)) {
			const parsed = suspendPayload.setupRequests
				.map((item) => workflowSetupNodeSchema.safeParse(item))
				.filter((r) => r.success)
				.map((r) => r.data);
			if (parsed.length > 0) {
				setupRequests = parsed;
			}
		}

		const workflowId =
			typeof suspendPayload.workflowId === 'string' ? suspendPayload.workflowId : undefined;

		let resourceDecision: GatewayConfirmationRequiredPayload | undefined;
		if (isRecord(suspendPayload.resourceDecision)) {
			const parsed = gatewayConfirmationRequiredPayloadSchema.safeParse(
				suspendPayload.resourceDecision,
			);
			if (parsed.success) {
				resourceDecision = parsed.data;
			}
		}

		return {
			type: 'confirmation-request',
			...base,
			payload: {
				requestId,
				toolCallId,
				toolName: typeof chunk.toolName === 'string' ? chunk.toolName : '',
				args: isRecord(chunk.input) ? chunk.input : {},
				severity,
				message:
					typeof suspendPayload.message === 'string'
						? suspendPayload.message
						: 'Confirmation required',
				...(credentialRequests ? { credentialRequests } : {}),
				...(projectId ? { projectId } : {}),
				...(inputType ? { inputType } : {}),
				...(domainAccess ? { domainAccess } : {}),
				...(credentialFlow ? { credentialFlow } : {}),
				...(setupRequests ? { setupRequests } : {}),
				...(workflowId ? { workflowId } : {}),
				...(questions ? { questions } : {}),
				...(introMessage ? { introMessage } : {}),
				...(tasks ? { tasks } : {}),
				...(planItems ? { planItems } : {}),
				...(resourceDecision ? { resourceDecision } : {}),
			},
		};
	}

	if (chunk.type === 'message' && 'role' in chunk.message && chunk.message.role === 'tool') {
		const toolCall = chunk.message.content.find((part) => part.type === 'tool-call');
		if (toolCall?.type === 'tool-call') {
			return {
				type: 'tool-call',
				...base,
				payload: {
					toolCallId: typeof toolCall.toolCallId === 'string' ? toolCall.toolCallId : '',
					toolName: toolCall.toolName,
					args: isRecord(toolCall.input) ? toolCall.input : {},
				},
			};
		}

		const toolResult = chunk.message.content.find((part) => part.type === 'tool-result');
		if (toolResult?.type === 'tool-result') {
			if (toolResult.isError === true) {
				return {
					type: 'tool-error',
					...base,
					payload: {
						toolCallId: toolResult.toolCallId,
						error:
							typeof toolResult.result === 'string' ? toolResult.result : 'Tool execution failed',
					},
				};
			}

			return {
				type: 'tool-result',
				...base,
				payload: {
					toolCallId: toolResult.toolCallId,
					result: toolResult.result,
				},
			};
		}
	}

	if (chunk.type === 'error') {
		const errorInfo = extractErrorInfo(chunk.error);
		return {
			type: 'error',
			...base,
			payload: {
				content: errorInfo.content,
				...(errorInfo.statusCode !== undefined ? { statusCode: errorInfo.statusCode } : {}),
				...(errorInfo.provider ? { provider: errorInfo.provider } : {}),
				...(errorInfo.technicalDetails ? { technicalDetails: errorInfo.technicalDetails } : {}),
			},
		};
	}

	return null;
}
