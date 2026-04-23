import type {
	InstanceAiEvalSubAgentRequest,
	InstanceAiEvalSubAgentResponse,
	InstanceAiEvalToolCall,
	InstanceAiEvalToolResult,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	createAllTools,
	createSubAgent,
	type InstanceAiContext,
	type InstanceAiWorkflowService,
} from '@n8n/instance-ai';
import { randomUUID } from 'node:crypto';

import { InstanceAiAdapterService } from '../instance-ai.adapter.service';
import { InstanceAiService } from '../instance-ai.service';

import { resolveSubAgentRole } from './sub-agent-roles';

/**
 * Eval-only fallback timeout. Production sub-agents don't impose their own
 * wall-clock cap — the orchestrator's abort signal governs that — so there's
 * no shared constant to borrow. Step budgets come from the role config, which
 * re-uses the same `MAX_STEPS` table the real sub-agents use.
 */
const DEFAULT_TIMEOUT_MS = 120_000;

@Service()
export class SubAgentEvalService {
	private readonly logger: Logger;

	constructor(
		private readonly adapterService: InstanceAiAdapterService,
		private readonly instanceAiService: InstanceAiService,
		logger: Logger,
	) {
		this.logger = logger.scoped('sub-agent-eval');
	}

	async run(
		user: User,
		request: InstanceAiEvalSubAgentRequest,
	): Promise<InstanceAiEvalSubAgentResponse> {
		const startMs = Date.now();
		const role = resolveSubAgentRole(request.role);
		const maxSteps = request.maxSteps ?? role.defaultMaxSteps;
		const timeoutMs = request.timeoutMs ?? DEFAULT_TIMEOUT_MS;

		const capturedWorkflowIds: string[] = [];
		const baseContext = this.adapterService.createContext(user);
		const context: InstanceAiContext = {
			...baseContext,
			workflowService: this.wrapWorkflowService(baseContext.workflowService, capturedWorkflowIds),
		};

		const tools = createAllTools(context);
		const modelId = request.modelId ?? (await this.instanceAiService.resolveAgentModelConfig(user));
		const agentId = `eval-${role.label}-${randomUUID()}`;

		const agent = createSubAgent({
			agentId,
			role: role.label,
			instructions: role.systemPrompt,
			tools,
			modelId,
		});

		const abortController = new AbortController();
		const timeoutError = new Error(`Sub-agent timed out after ${String(timeoutMs)}ms`);
		const timeoutId = setTimeout(() => abortController.abort(timeoutError), timeoutMs);

		try {
			const result = await agent.generate(request.prompt, {
				maxSteps,
				abortSignal: abortController.signal,
			});

			return {
				text: result.text ?? '',
				toolCalls: serializeToolCalls(result.toolCalls ?? []),
				toolResults: serializeToolResults(result.toolResults ?? []),
				capturedWorkflowIds,
				durationMs: Date.now() - startMs,
				...(typeof result.finishReason === 'string' ? { stopReason: result.finishReason } : {}),
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.logger.warn('sub-agent eval run failed', { error: message, agentId });
			return {
				text: '',
				toolCalls: [],
				toolResults: [],
				capturedWorkflowIds,
				durationMs: Date.now() - startMs,
				error: message,
			};
		} finally {
			clearTimeout(timeoutId);
		}
	}

	private wrapWorkflowService(
		original: InstanceAiWorkflowService,
		capturedIds: string[],
	): InstanceAiWorkflowService {
		const capture = (id: string) => {
			if (!capturedIds.includes(id)) capturedIds.push(id);
		};
		return {
			...original,
			createFromWorkflowJSON: async (json) => {
				const detail = await original.createFromWorkflowJSON(json);
				capture(detail.id);
				return detail;
			},
			updateFromWorkflowJSON: async (workflowId, json) => {
				const detail = await original.updateFromWorkflowJSON(workflowId, json);
				capture(detail.id);
				return detail;
			},
		};
	}
}

function serializeToolCalls(raw: unknown[]): InstanceAiEvalToolCall[] {
	return raw.map((tc) => {
		const payload = (tc as { payload?: { toolName?: string; args?: unknown } }).payload;
		return {
			toolName: payload?.toolName ?? 'unknown',
			args: payload?.args,
		};
	});
}

function serializeToolResults(raw: unknown[]): InstanceAiEvalToolResult[] {
	return raw.map((tr) => {
		const payload = (tr as { payload?: { toolName?: string; result?: unknown } }).payload;
		const result = payload?.result;
		const isError =
			typeof result === 'object' &&
			result !== null &&
			'success' in result &&
			(result as { success: unknown }).success === false;
		return {
			toolName: payload?.toolName ?? 'unknown',
			result,
			isError,
		};
	});
}
