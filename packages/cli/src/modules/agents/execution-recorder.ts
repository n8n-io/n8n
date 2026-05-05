import { UPDATE_WORKING_MEMORY_TOOL_NAME, type StreamChunk } from '@n8n/agents';
import { extractFromAICalls, isFromAIOnlyExpression } from 'n8n-workflow';

import type { ToolRegistry } from './tool-registry';

/** Pull the human-readable working-memory content out of the WM tool's input. */
function workingMemoryContentFromInput(input: unknown): string {
	if (input && typeof input === 'object' && !Array.isArray(input)) {
		const maybe = (input as Record<string, unknown>).memory;
		if (typeof maybe === 'string') return maybe;
	}
	return JSON.stringify(input, null, 2);
}

/**
 * Walk a nodeParameters tree and substitute every `$fromAI('key', ...)`
 * expression with the value the LLM passed for that key (or the call's
 * default when the LLM didn't provide one). Used when recording a
 * `kind: 'node'` tool call so the timeline shows the resolved values the
 * node would have run with — not the raw template strings the user
 * configured.
 *
 * Pure best-effort: parsing failures fall through to the raw string. The
 * goal is a clearer log entry, not exact expression-engine fidelity.
 */
function resolveFromAIInValue(value: unknown, llmArgs: Record<string, unknown>): unknown {
	if (typeof value === 'string') return resolveFromAIInString(value, llmArgs);
	if (Array.isArray(value)) return value.map((v) => resolveFromAIInValue(v, llmArgs));
	if (value !== null && typeof value === 'object') {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value)) {
			out[k] = resolveFromAIInValue(v, llmArgs);
		}
		return out;
	}
	return value;
}

function resolveFromAIInString(str: string, llmArgs: Record<string, unknown>): unknown {
	if (!str.includes('$fromAI')) return str;

	let calls: ReturnType<typeof extractFromAICalls>;
	try {
		calls = extractFromAICalls(str);
	} catch {
		return str;
	}
	if (calls.length === 0) return str;

	// Full-string `$fromAI(...)` — replace the entire value with the resolved
	// arg so the timeline shows e.g. the literal prompt text, not `={{ ... }}`.
	if (isFromAIOnlyExpression(str)) {
		const call = calls[0];
		if (call.key in llmArgs) return llmArgs[call.key];
		if (call.defaultValue !== undefined) return call.defaultValue;
		return str;
	}

	// Mixed-content expression — substitute each `$fromAI(...)` call inline.
	// We re-scan with a forgiving pattern; precise expression-engine rules
	// (e.g. nested calls) aren't supported, but the common case of a single
	// call inside `={{ ... }}` works.
	const pattern = /\$fromAI\s*\([^)]*\)/g;
	return str.replace(pattern, (match) => {
		try {
			const inner = extractFromAICalls(match);
			if (inner.length === 0) return match;
			const call = inner[0];
			const resolved =
				call.key in llmArgs
					? llmArgs[call.key]
					: call.defaultValue !== undefined
						? call.defaultValue
						: undefined;
			if (resolved === undefined) return match;
			if (typeof resolved === 'object') return JSON.stringify(resolved);
			return String(resolved);
		} catch {
			return match;
		}
	});
}

export interface RecordedUsage {
	promptTokens: number;
	completionTokens: number;
	totalTokens: number;
}

export interface RecordedToolCall {
	name: string;
	input: unknown;
	output: unknown;
}

export type TimelineEvent =
	| { type: 'text'; content: string; timestamp: number; endTime?: number }
	| {
			type: 'tool-call';
			kind: 'tool' | 'workflow' | 'node';
			name: string;
			toolCallId: string;
			input: unknown;
			output: unknown;
			startTime: number;
			endTime: number;
			success: boolean;
			workflowId?: string;
			workflowName?: string;
			workflowExecutionId?: string;
			triggerType?: string;
			nodeType?: string;
			nodeTypeVersion?: number;
			nodeDisplayName?: string;
			/**
			 * Configured node parameters from the agent's JSON config (only set
			 * for `kind: 'node'`). The LLM's runtime args go into `input`; this
			 * field carries the node's actual configuration so the session-
			 * detail viewer can show what the node was set up to do.
			 */
			nodeParameters?: Record<string, unknown>;
	  }
	| { type: 'working-memory'; content: string; timestamp: number }
	| { type: 'suspension'; toolName: string; toolCallId: string; timestamp: number };

function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null;
}

/**
 * Collects execution data from agent stream chunks.
 * Used to build an execution record after a message cycle completes.
 */
export interface MessageRecord {
	assistantResponse: string;
	model: string | null;
	finishReason: string;
	usage: RecordedUsage | null;
	totalCost: number | null;
	toolCalls: RecordedToolCall[];
	timeline: TimelineEvent[];
	startTime: number;
	duration: number;
	error: string | null;
	workingMemory: string | null;
}

export class ExecutionRecorder {
	private readonly registry: ToolRegistry;

	constructor(registry?: ToolRegistry) {
		this.registry = registry ?? new Map();
	}

	private textParts: string[] = [];

	/** Text buffer for the current segment (flushed to timeline on boundaries). */
	private textBuffer: string[] = [];

	private model: string | null = null;

	private finishReason = 'unknown';

	private usage: RecordedUsage | null = null;

	private totalCost: number | null = null;

	private toolCalls: RecordedToolCall[] = [];

	private timeline: TimelineEvent[] = [];

	/** Wall-clock when the first text-delta of the current segment arrived. */
	private textStartTime: number | null = null;

	private _suspended = false;

	private error: string | null = null;

	private workingMemory: string | null = null;

	private readonly startTime = Date.now();

	/** Feed a stream chunk into the recorder. */
	record(chunk: StreamChunk): void {
		switch (chunk.type) {
			case 'text-delta':
				if (this.textStartTime === null) this.textStartTime = Date.now();
				this.textParts.push(chunk.delta);
				this.textBuffer.push(chunk.delta);
				break;
			case 'tool-call':
				if (chunk.toolName === UPDATE_WORKING_MEMORY_TOOL_NAME) {
					this.recordWorkingMemoryUpdate(workingMemoryContentFromInput(chunk.input));
				} else {
					this.recordToolCall(chunk.toolCallId, chunk.toolName, chunk.input);
				}
				break;
			case 'tool-result':
				if (chunk.toolName === UPDATE_WORKING_MEMORY_TOOL_NAME) {
					// WM tool-result is already represented by the timeline entry
					// pushed at tool-call time; nothing more to do here.
					break;
				}
				this.recordToolResult(
					chunk.toolCallId,
					chunk.toolName,
					chunk.output,
					chunk.isError === true,
				);
				break;
			case 'finish':
				this.flushTextBuffer();
				this.finishReason = chunk.finishReason;
				if (chunk.usage) {
					this.usage = {
						promptTokens: chunk.usage.promptTokens,
						completionTokens: chunk.usage.completionTokens,
						totalTokens: chunk.usage.totalTokens,
					};
				}
				this.model = chunk.model ?? null;
				this.totalCost = chunk.totalCost ?? chunk.usage?.cost ?? null;
				break;
			case 'tool-call-suspended':
				this.flushTextBuffer();
				this._suspended = true;
				this.timeline.push({
					type: 'suspension',
					toolName: chunk.toolName ?? '',
					toolCallId: chunk.toolCallId ?? '',
					timestamp: Date.now(),
				});
				break;
			case 'error': {
				const errMsg = chunk.error instanceof Error ? chunk.error.message : String(chunk.error);
				this.error = errMsg;
				break;
			}
		}
	}

	/** Whether the stream ended with a tool-call suspension (incomplete cycle). */
	get suspended(): boolean {
		return this._suspended;
	}

	/** Build the final message record after the stream has ended. */
	getMessageRecord(): MessageRecord {
		this.flushTextBuffer();
		return {
			assistantResponse: this.textParts.join(''),
			model: this.model,
			finishReason: this.finishReason,
			usage: this.usage,
			totalCost: this.totalCost,
			toolCalls: this.toolCalls,
			timeline: this.timeline,
			startTime: this.startTime,
			duration: Date.now() - this.startTime,
			error: this.error,
			workingMemory: this.workingMemory,
		};
	}

	/** Flush accumulated text into a timeline event. */
	private flushTextBuffer(): void {
		if (this.textBuffer.length === 0) return;
		const content = this.textBuffer.join('');
		if (content.trim()) {
			const now = Date.now();
			this.timeline.push({
				type: 'text',
				content,
				// Generation start (first text-delta) → end (now). Falls back to `now`
				// if no start was recorded (defensive: empty segment shouldn't reach here).
				timestamp: this.textStartTime ?? now,
				endTime: now,
			});
		}
		this.textBuffer = [];
		this.textStartTime = null;
	}

	private recordWorkingMemoryUpdate(content: string): void {
		this.flushTextBuffer();
		this.workingMemory = content;
		this.timeline.push({
			type: 'working-memory',
			content,
			timestamp: Date.now(),
		});
	}

	/**
	 * Record a discrete `tool-call` chunk from the stream. Maintains both the
	 * flat `toolCalls` array (backward compat) and the ordered timeline. The
	 * matching `tool-result` chunk closes the timeline entry.
	 */
	private recordToolCall(toolCallId: string, name: string, input: unknown): void {
		this.flushTextBuffer();

		this.toolCalls.push({ name, input, output: undefined });

		const entry = this.registry.get(name);
		// Resolve `$fromAI(...)` expressions in nodeParameters using the LLM's
		// args so the timeline shows the values the node would have run with
		// (e.g. the actual prompt text) rather than raw template strings.
		const llmArgs =
			input !== null && typeof input === 'object' ? (input as Record<string, unknown>) : {};
		const resolvedNodeParameters =
			entry?.nodeParameters !== undefined
				? (resolveFromAIInValue(entry.nodeParameters, llmArgs) as Record<string, unknown>)
				: undefined;
		this.timeline.push({
			type: 'tool-call',
			kind: entry?.kind ?? 'tool',
			name,
			toolCallId,
			input,
			output: undefined as unknown,
			startTime: Date.now(),
			endTime: 0,
			success: false,
			workflowId: entry?.workflowId,
			workflowName: entry?.workflowName,
			triggerType: entry?.triggerType,
			nodeType: entry?.nodeType,
			nodeTypeVersion: entry?.nodeTypeVersion,
			nodeDisplayName: entry?.nodeDisplayName,
			nodeParameters: resolvedNodeParameters,
		});
	}

	/**
	 * Record a discrete `tool-result` chunk from the stream. Closes the
	 * matching open timeline entry by `toolCallId` (preferred) or by name as
	 * a fallback.
	 *
	 * On HITL/approval resume, the SDK replays the `tool-result` for the
	 * pending call without a preceding `tool-call`, so there is no open
	 * timeline entry to close. In that case we synthesize one from the
	 * registry so workflow rows and execution-log links still render.
	 */
	private recordToolResult(
		toolCallId: string,
		name: string,
		output: unknown,
		isError: boolean,
	): void {
		const pendingFlat = [...this.toolCalls]
			.reverse()
			.find((tc) => tc.name === name && tc.output === undefined);
		if (pendingFlat) {
			pendingFlat.output = output;
		} else {
			this.toolCalls.push({ name, input: undefined, output });
		}

		const pendingTimeline = [...this.timeline]
			.reverse()
			.find(
				(e): e is TimelineEvent & { type: 'tool-call' } =>
					e.type === 'tool-call' &&
					(toolCallId ? e.toolCallId === toolCallId : e.name === name) &&
					e.endTime === 0,
			);
		if (pendingTimeline) {
			pendingTimeline.output = output;
			pendingTimeline.endTime = Date.now();
			pendingTimeline.success = !isError;

			if (pendingTimeline.kind === 'workflow' && isRecord(output)) {
				const execId = output.executionId;
				if (typeof execId === 'string') {
					pendingTimeline.workflowExecutionId = execId;
				}
			}
			return;
		}

		this.flushTextBuffer();
		const entry = this.registry.get(name);
		const now = Date.now();
		const synthesized: TimelineEvent = {
			type: 'tool-call',
			kind: entry?.kind ?? 'tool',
			name,
			toolCallId,
			input: undefined,
			output,
			startTime: now,
			endTime: now,
			success: !isError,
			workflowId: entry?.workflowId,
			workflowName: entry?.workflowName,
			triggerType: entry?.triggerType,
			nodeType: entry?.nodeType,
			nodeTypeVersion: entry?.nodeTypeVersion,
			nodeDisplayName: entry?.nodeDisplayName,
			nodeParameters: entry?.nodeParameters,
		};
		if (synthesized.kind === 'workflow' && isRecord(output)) {
			const execId = output.executionId;
			if (typeof execId === 'string') {
				synthesized.workflowExecutionId = execId;
			}
		}
		this.timeline.push(synthesized);
	}
}
