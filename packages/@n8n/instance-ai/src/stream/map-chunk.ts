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

interface ErrorInfo {
	content: string;
	statusCode?: number;
	provider?: string;
	technicalDetails?: string;
}

/** Extract structured error info from Mastra's error chunk payload.
 *  Mastra sets `payload.error` to the raw Error object, not a string. */
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

/**
 * Maps a Mastra fullStream chunk to our InstanceAiEvent schema.
 *
 * Mastra chunks have the shape: { type, runId, from, payload: { ... } }
 * The actual data (textDelta, toolCallId, etc.) lives inside chunk.payload.
 *
 * Returns null for unrecognized chunk types (step-finish, finish, etc.)
 */
export function mapMastraChunkToEvent(
	runId: string,
	agentId: string,
	chunk: unknown,
	responseId?: string,
): InstanceAiEvent | null {
	if (!isRecord(chunk)) return null;

	const { type } = chunk;
	const payload = isRecord(chunk.payload) ? chunk.payload : {};
	const base = { runId, agentId, ...(responseId ? { responseId } : {}) };

	// Mastra payload uses `text` (not `textDelta`) for text-delta chunks
	const textValue =
		typeof payload.text === 'string'
			? payload.text
			: typeof payload.textDelta === 'string'
				? payload.textDelta
				: undefined;

	if (type === 'text-delta' && textValue !== undefined) {
		return {
			type: 'text-delta',
			...base,
			payload: { text: textValue },
		};
	}

	if ((type === 'reasoning-delta' || type === 'reasoning') && textValue !== undefined) {
		return {
			type: 'reasoning-delta',
			...base,
			payload: { text: textValue },
		};
	}

	if (type === 'tool-call') {
		return {
			type: 'tool-call',
			...base,
			payload: {
				toolCallId: typeof payload.toolCallId === 'string' ? payload.toolCallId : '',
				toolName: typeof payload.toolName === 'string' ? payload.toolName : '',
				args: isRecord(payload.args) ? payload.args : {},
			},
		};
	}

	if (type === 'tool-result' || type === 'tool-error') {
		const toolCallId = typeof payload.toolCallId === 'string' ? payload.toolCallId : '';

		// Mastra signals tool errors via `isError` on tool-result chunks,
		// not a separate event type. Map to our `tool-error` event.
		if (payload.isError === true) {
			return {
				type: 'tool-error',
				...base,
				payload: {
					toolCallId,
					error: typeof payload.result === 'string' ? payload.result : 'Tool execution failed',
				},
			};
		}

		return {
			type: 'tool-result',
			...base,
			payload: {
				toolCallId,
				result: payload.result,
			},
		};
	}

	if (type === 'tool-call-suspended') {
		const suspendPayload = isRecord(payload.suspendPayload) ? payload.suspendPayload : {};
		const toolCallId = typeof payload.toolCallId === 'string' ? payload.toolCallId : '';

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

		// Extract and validate optional credentialRequests for credential setup HITL
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

		// Extract optional projectId for project-scoped actions
		const projectId =
			typeof suspendPayload.projectId === 'string' ? suspendPayload.projectId : undefined;

		// Extract optional inputType (e.g., 'text' for ask-user, 'questions', 'plan-review', 'resource-decision')
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

		// Extract optional structured questions (for ask-user tool with questions)
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

		// Extract optional intro message
		const introMessage =
			typeof suspendPayload.introMessage === 'string' ? suspendPayload.introMessage : undefined;

		// Extract optional task list (for plan-review)
		let tasks: TaskList | undefined;
		if (isRecord(suspendPayload.tasks)) {
			const parsed = taskListSchema.safeParse(suspendPayload.tasks);
			if (parsed.success) {
				tasks = parsed.data;
			}
		}

		// Extract optional full planned task items (for plan-review panel details)
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

		// Extract optional domainAccess metadata (for domain-gated tools like fetch-url)
		const rawDomainAccess = isRecord(suspendPayload.domainAccess)
			? suspendPayload.domainAccess
			: undefined;
		const domainAccess =
			rawDomainAccess &&
			typeof rawDomainAccess.url === 'string' &&
			typeof rawDomainAccess.host === 'string'
				? { url: rawDomainAccess.url, host: rawDomainAccess.host }
				: undefined;

		// Extract optional credentialFlow for credential setup stage
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

		// Extract and validate optional setupRequests for workflow setup HITL
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

		// Extract optional workflowId for workflow setup tool
		const workflowId =
			typeof suspendPayload.workflowId === 'string' ? suspendPayload.workflowId : undefined;

		// Extract optional resourceDecision for gateway permission gating (inputType=resource-decision)
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
				toolName: typeof payload.toolName === 'string' ? payload.toolName : '',
				args: isRecord(payload.args) ? payload.args : {},
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

	if (type === 'error') {
		const errorInfo = extractErrorInfo(payload.error);
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

	// Other Mastra chunk types (step-finish, finish, etc.) are ignored
	return null;
}
