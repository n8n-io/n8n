import type { StreamChunk } from '@n8n/agents';
import { extractFromAICalls, isFromAIOnlyExpression } from 'n8n-workflow';

import type { ToolRegistry } from './tool-registry';

/**
 * Walk a nodeParameters tree and substitute templated values with what the
 * LLM passed: both `$fromAI('key', ...)` placeholders and `={{ $json.path }}`
 * lookups (the LLM's structured input is the node's `$json` at runtime — see
 * `node-tool-factory.ts` where input flows in as `[{ json: input }]`). Used
 * when recording a `kind: 'node'` tool call so the timeline shows the values
 * the node would have run with, not the raw template strings the user
 * configured.
 *
 * Pure best-effort: parsing failures fall through to the raw string. The
 * goal is a clearer log entry, not exact expression-engine fidelity.
 */
function resolveTemplatesInValue(value: unknown, llmArgs: Record<string, unknown>): unknown {
	if (typeof value === 'string') return resolveTemplatesInString(value, llmArgs);
	if (Array.isArray(value)) return value.map((v) => resolveTemplatesInValue(v, llmArgs));
	if (value !== null && typeof value === 'object') {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value)) {
			out[k] = resolveTemplatesInValue(v, llmArgs);
		}
		return out;
	}
	return value;
}

function resolveTemplatesInString(str: string, llmArgs: Record<string, unknown>): unknown {
	const afterFromAI = resolveFromAIInString(str, llmArgs);
	if (typeof afterFromAI !== 'string') return afterFromAI;
	return resolveJsonRefsInString(afterFromAI, llmArgs);
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

// Single full-string expression like `={{ $json.foo.bar }}`. Captures the
// dotted path after `$json`. Bracket access and JS expressions are out of
// scope here — this resolver is for display only, not for actual node
// execution.
const FULL_JSON_REF_PATTERN = /^=\s*\{\{\s*\$json((?:\s*\.\s*[a-zA-Z_$][\w$]*)+)\s*\}\}\s*$/;
const INLINE_JSON_REF_PATTERN = /\{\{\s*\$json((?:\s*\.\s*[a-zA-Z_$][\w$]*)+)\s*\}\}/g;

function resolveJsonRefsInString(str: string, llmArgs: Record<string, unknown>): unknown {
	if (!str.startsWith('=') || !str.includes('$json')) return str;

	const fullMatch = str.match(FULL_JSON_REF_PATTERN);
	if (fullMatch) {
		const resolved = lookupJsonPath(llmArgs, fullMatch[1]);
		return resolved === undefined ? str : resolved;
	}

	let replaced = false;
	const out = str.replace(INLINE_JSON_REF_PATTERN, (match, path: string) => {
		const resolved = lookupJsonPath(llmArgs, path);
		if (resolved === undefined) return match;
		replaced = true;
		if (typeof resolved === 'object') return JSON.stringify(resolved);
		return String(resolved);
	});
	return replaced ? out : str;
}

function lookupJsonPath(root: Record<string, unknown>, dottedPath: string): unknown {
	const segments = dottedPath
		.split('.')
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
	let cur: unknown = root;
	for (const seg of segments) {
		if (cur === null || cur === undefined) return undefined;
		if (typeof cur !== 'object') return undefined;
		cur = (cur as Record<string, unknown>)[seg];
	}
	return cur;
}

/**
 * Tool errors arrive on the `tool-result` chunk as raw `Error` instances
 * (see `agent-runtime.ts` → `tool-result` write on `batch.errors`). Persisting
 * those directly produces `"output": {}` because `Error.name`/`message`/`stack`
 * are non-enumerable, so the timeline drops the diagnostic the UI needs. Wrap
 * Errors and bare strings into an enumerable `{ error }` shape; pass through
 * objects that already carry their own shape.
 */
function normaliseToolErrorOutput(output: unknown): unknown {
	if (output instanceof Error) {
		return { error: output.message || output.name || 'Tool execution failed' };
	}
	if (typeof output === 'string') {
		return { error: output };
	}
	return output;
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
	 * Record a discrete `tool-call` chunk from the stream. Maintains both the
	 * flat `toolCalls` array (backward compat) and the ordered timeline. The
	 * matching `tool-result` chunk closes the timeline entry.
	 */
	private recordToolCall(toolCallId: string, name: string, input: unknown): void {
		this.flushTextBuffer();

		this.toolCalls.push({ name, input, output: undefined });

		const entry = this.registry.get(name);
		// Resolve both `$fromAI(...)` placeholders and simple `={{ $json.x }}`
		// references in nodeParameters using the LLM's args, so the timeline
		// shows the values the node would have run with (e.g. the actual
		// prompt text) rather than raw template strings.
		const llmArgs =
			input !== null && typeof input === 'object' ? (input as Record<string, unknown>) : {};
		const resolvedNodeParameters =
			entry?.nodeParameters !== undefined
				? (resolveTemplatesInValue(entry.nodeParameters, llmArgs) as Record<string, unknown>)
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
		const recordedOutput = isError ? normaliseToolErrorOutput(output) : output;

		const pendingFlat = [...this.toolCalls]
			.reverse()
			.find((tc) => tc.name === name && tc.output === undefined);
		if (pendingFlat) {
			pendingFlat.output = recordedOutput;
		} else {
			this.toolCalls.push({ name, input: undefined, output: recordedOutput });
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
			pendingTimeline.output = recordedOutput;
			pendingTimeline.endTime = Date.now();
			pendingTimeline.success = !isError;

			if (pendingTimeline.kind === 'workflow' && isRecord(recordedOutput)) {
				const execId = recordedOutput.executionId;
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
			output: recordedOutput,
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
		if (synthesized.kind === 'workflow' && isRecord(recordedOutput)) {
			const execId = recordedOutput.executionId;
			if (typeof execId === 'string') {
				synthesized.workflowExecutionId = execId;
			}
		}
		this.timeline.push(synthesized);
	}
}
