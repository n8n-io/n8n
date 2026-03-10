import type { InstanceAiEvent, PlanObject } from '@n8n/api-types';

import type { InstanceAiEventBus } from '../../event-bus/event-bus.interface';
import type { IterationLog } from '../../storage/iteration-log';
import type { PlanStorage } from '../../types';

/** Tool names that map to plan steps (major actions that move the plan forward). */
const TRACKED_TOOLS = new Set([
	'delegate',
	'build-workflow-with-agent',
	'manage-data-tables-with-agent',
	'research-with-agent',
	'patch-workflow',
]);

/**
 * Auto-tracks plan progress based on tool-call and tool-result events.
 * Eliminates the need for the LLM to manually call plan(update) after each action.
 *
 * Rules:
 * - On tool-call for a tracked tool: find the first in_progress or pending step,
 *   set it to in_progress, link it via toolCallId.
 * - On tool-result for a tracked tool: find the step linked to that toolCallId,
 *   set it to completed (or failed if result contains an error).
 * - On tool-error for a tracked tool: mark the linked step as failed.
 */
export class PlanAutoTracker {
	private unsubscribe: (() => void) | null = null;

	/** toolCallId → true for tool calls we're tracking. */
	private activeToolCalls = new Set<string>();

	/** toolCallId → tool name for iteration log capture. */
	private toolCallNames = new Map<string, string>();

	constructor(
		private readonly threadId: string,
		private readonly runId: string,
		private readonly agentId: string,
		private readonly eventBus: InstanceAiEventBus,
		private readonly planStorage: PlanStorage,
		private readonly iterationLog?: IterationLog,
	) {}

	start(): void {
		this.unsubscribe = this.eventBus.subscribe(this.threadId, (stored) => {
			void this.handleEvent(stored.event);
		});
	}

	stop(): void {
		this.unsubscribe?.();
		this.unsubscribe = null;
	}

	private async handleEvent(event: InstanceAiEvent): Promise<void> {
		// Only track events from the orchestrator agent in our run
		if (event.runId !== this.runId || event.agentId !== this.agentId) return;

		if (event.type === 'tool-call' && TRACKED_TOOLS.has(event.payload.toolName)) {
			this.toolCallNames.set(event.payload.toolCallId, event.payload.toolName);
			await this.onTrackedToolCall(event.payload.toolCallId);
		}

		if (event.type === 'tool-result' && this.activeToolCalls.has(event.payload.toolCallId)) {
			const hasError = isErrorResult(event.payload.result);
			const rawResult: unknown = event.payload.result;
			let resultStr: string;
			if (typeof rawResult === 'object' && rawResult !== null) {
				resultStr = JSON.stringify(rawResult);
			} else if (typeof rawResult === 'string') {
				resultStr = rawResult;
			} else {
				resultStr = '';
			}
			await this.onTrackedToolResult(event.payload.toolCallId, hasError, resultStr);
		}

		if (event.type === 'tool-error' && this.activeToolCalls.has(event.payload.toolCallId)) {
			const errorMsg =
				typeof event.payload.error === 'string' ? event.payload.error : 'Unknown tool error';
			await this.onTrackedToolResult(event.payload.toolCallId, true, errorMsg);
		}
	}

	private async onTrackedToolCall(toolCallId: string): Promise<void> {
		const plan = await this.planStorage.get(this.threadId);
		if (!plan) return;

		// Find the first step that should be activated
		const step =
			plan.steps.find((s) => s.status === 'in_progress' && !s.toolCallId) ??
			plan.steps.find((s) => s.status === 'pending');

		if (!step) return;

		step.status = 'in_progress';
		step.toolCallId = toolCallId;
		this.activeToolCalls.add(toolCallId);

		await this.savePlanAndEmit(plan);
	}

	private async onTrackedToolResult(
		toolCallId: string,
		isError: boolean,
		resultText?: string,
	): Promise<void> {
		const toolName = this.toolCallNames.get(toolCallId) ?? 'unknown';
		this.activeToolCalls.delete(toolCallId);
		this.toolCallNames.delete(toolCallId);

		const plan = await this.planStorage.get(this.threadId);
		if (!plan) return;

		const step = plan.steps.find((s) => s.toolCallId === toolCallId);
		if (!step) return;

		step.status = isError ? 'failed' : 'completed';

		// Auto-capture failures to iteration log for retry intelligence
		if (isError && this.iterationLog) {
			const taskKey = step.toolCallId ?? `${toolName}:unknown`;
			const existing = await this.iterationLog.getForTask(this.threadId, taskKey);
			try {
				await this.iterationLog.append(this.threadId, taskKey, {
					attempt: existing.length + 1,
					action: toolName,
					result: resultText ?? '',
					error: resultText,
				});
			} catch {
				// Non-fatal — iteration log is best-effort
			}
		}

		// Auto-insert a verify step after successful build completion
		if (!isError && toolName === 'build-workflow-with-agent' && step.toolCallId) {
			const stepIndex = plan.steps.indexOf(step);
			const hasVerifyAfter =
				stepIndex + 1 < plan.steps.length &&
				plan.steps[stepIndex + 1].description.toLowerCase().includes('verify');
			if (!hasVerifyAfter) {
				plan.steps.splice(stepIndex + 1, 0, {
					phase: 'execute',
					description: `Verify ${step.description.replace(/^Build\s+/i, '')}`,
					status: 'pending',
				});
			}
		}

		await this.savePlanAndEmit(plan);
	}

	private async savePlanAndEmit(plan: PlanObject): Promise<void> {
		await this.planStorage.save(this.threadId, plan);
		this.eventBus.publish(this.threadId, {
			type: 'plan-update',
			runId: this.runId,
			agentId: this.agentId,
			payload: { plan },
		});
	}
}

function isErrorResult(result: unknown): boolean {
	if (result === null || result === undefined) return false;
	if (typeof result === 'string') {
		// Only match explicit error prefixes — avoid false positives on
		// strings like "No errors found" or "Fixed the error".
		const trimmed = result.trimStart().toLowerCase();
		return (
			trimmed.startsWith('error:') ||
			trimmed.startsWith('sub-agent error') ||
			trimmed.startsWith('delegation failed')
		);
	}
	if (typeof result === 'object') {
		const obj = result as Record<string, unknown>;
		if (obj.error) return true;
		if (obj.status === 'error') return true;
		if (typeof obj.result === 'string') {
			const r = obj.result.trimStart().toLowerCase();
			return r.startsWith('error:') || r.startsWith('sub-agent error');
		}
	}
	return false;
}
