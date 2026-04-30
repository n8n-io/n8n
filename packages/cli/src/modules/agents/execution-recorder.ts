import type { StreamChunk } from '@n8n/agents';
import type { ToolRegistry } from './tool-registry';

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

	/**
	 * toolCallIds whose timeline entry has been settled by a `tool-card-display`
	 * chunk. The runtime emits both the side-effect chunk AND a regular
	 * `tool-result` for the same toolCallId; without this set the recorder
	 * would create a duplicate timeline entry plus stash the synthetic
	 * LLM-visible ack as the canonical output.
	 */
	private settledByDisplay = new Set<string>();

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
				this.recordToolCall(chunk.toolCallId, chunk.toolName, chunk.input);
				break;
			case 'tool-result':
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
			case 'tool-card-display':
				this.settleDisplayChunk(chunk.toolName, chunk.toolCallId, chunk.payload, {
					displayed: true,
				});
				break;
			case 'working-memory-update':
				this.flushTextBuffer();
				this.workingMemory = chunk.content;
				this.timeline.push({
					type: 'working-memory',
					content: chunk.content,
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

	/**
	 * Settle the timeline entry for a tool that emitted a side-effect chunk
	 * (`tool-card-display`) instead of a normal result. The runtime emits the
	 * side-effect chunk *and* a regular `tool-result` for the same toolCallId
	 * — without this dedup the timeline ends up with one duplicated row whose
	 * output is the LLM-visible synthetic ack, plus a second row from the
	 * side-effect chunk.
	 *
	 * Strategy: find the open `tool-call` timeline entry (created by the
	 * preceding `tool-call` chunk), update it in-place with the canonical
	 * input/output of the side-effect, and mark the toolCallId so the later
	 * `tool-result` is a no-op for both flat and timeline tracking.
	 */
	private settleDisplayChunk(
		name: string,
		toolCallId: string,
		input: unknown,
		output: unknown,
	): void {
		this.flushTextBuffer();
		this.settledByDisplay.add(toolCallId);

		const open = [...this.timeline]
			.reverse()
			.find(
				(e): e is TimelineEvent & { type: 'tool-call' } =>
					e.type === 'tool-call' && e.toolCallId === toolCallId && e.endTime === 0,
			);
		const now = Date.now();
		if (open) {
			open.input = input;
			open.output = output;
			open.endTime = now;
			open.success = true;
		} else {
			// Defensive: no preceding `tool-call` chunk was recorded (e.g. on
			// HITL resume the SDK doesn't replay it). Synthesize a fresh entry,
			// preserving registry metadata so workflow/node link fields render.
			const entry = this.registry.get(name);
			const synthesized: TimelineEvent = {
				type: 'tool-call',
				kind: entry?.kind ?? 'tool',
				name,
				toolCallId,
				input,
				output,
				startTime: now,
				endTime: now,
				success: true,
				workflowId: entry?.workflowId,
				workflowName: entry?.workflowName,
				triggerType: entry?.triggerType,
				nodeType: entry?.nodeType,
				nodeTypeVersion: entry?.nodeTypeVersion,
				nodeDisplayName: entry?.nodeDisplayName,
			};
			if (synthesized.kind === 'workflow' && isRecord(output)) {
				const execId = output.executionId;
				if (typeof execId === 'string') {
					synthesized.workflowExecutionId = execId;
				}
			}
			this.timeline.push(synthesized);
		}

		const flatOpen = [...this.toolCalls]
			.reverse()
			.find((tc) => tc.name === name && tc.output === undefined);
		if (flatOpen) {
			flatOpen.input = input;
			flatOpen.output = output;
		} else {
			this.toolCalls.push({ name, input, output });
		}
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
		// If this toolCallId already settled via a `tool-card-display` chunk,
		// drop the synthetic ack the LLM saw — the display payload is the
		// canonical record.
		if (this.settledByDisplay.has(toolCallId)) {
			return;
		}

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
