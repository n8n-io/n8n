import { jsonParse } from 'n8n-workflow';

// ── Trace Event Types ───────────────────────────────────────────────────────

export interface TraceHeader {
	kind: 'header';
	version: number;
	testName: string;
	recordedAt: string;
}

export interface TraceToolCall {
	kind: 'tool-call';
	stepId: number;
	agentRole: string;
	toolName: string;
	input: Record<string, unknown>;
	output: Record<string, unknown>;
}

export interface TraceToolSuspend {
	kind: 'tool-suspend';
	stepId: number;
	agentRole: string;
	toolName: string;
	input: Record<string, unknown>;
	output: Record<string, unknown>;
	suspendPayload: Record<string, unknown>;
}

export interface TraceToolResume {
	kind: 'tool-resume';
	stepId: number;
	agentRole: string;
	toolName: string;
	input: Record<string, unknown>;
	output: Record<string, unknown>;
	resumeData: Record<string, unknown>;
}

export type TraceEvent = TraceHeader | TraceToolCall | TraceToolSuspend | TraceToolResume;

type ToolTraceEvent = TraceToolCall | TraceToolSuspend | TraceToolResume;

function isToolEvent(event: TraceEvent): event is ToolTraceEvent {
	return event.kind !== 'header';
}

// ── TraceIndex ──────────────────────────────────────────────────────────────

/**
 * Groups trace events by agentRole with per-role cursors.
 * Advancing a cursor validates the expected tool name matches, catching
 * divergence between the recorded trace and the current replay.
 */
export class TraceIndex {
	private byRole: Map<string, ToolTraceEvent[]>;

	private cursors: Map<string, number>;

	constructor(events: TraceEvent[]) {
		this.byRole = new Map();
		this.cursors = new Map();

		for (const event of events) {
			if (!isToolEvent(event)) continue;
			const list = this.byRole.get(event.agentRole);
			if (list) {
				list.push(event);
			} else {
				this.byRole.set(event.agentRole, [event]);
			}
		}
	}

	next(agentRole: string, expectedToolName: string): ToolTraceEvent {
		const events = this.byRole.get(agentRole);
		const cursor = this.cursors.get(agentRole) ?? 0;

		if (!events || cursor >= events.length) {
			throw new Error(`Trace exhausted for role "${agentRole}" — agent diverged from recording`);
		}

		const event = events[cursor];
		if (event.toolName !== expectedToolName) {
			throw new Error(
				`Tool mismatch at step ${event.stepId}: expected "${expectedToolName}", ` +
					`trace has "${event.toolName}" — agent took a different path`,
			);
		}

		this.cursors.set(agentRole, cursor + 1);
		return event;
	}

	nextMatching(agentRole: string, expectedToolName: string): ToolTraceEvent | null {
		const events = this.byRole.get(agentRole);
		const cursor = this.cursors.get(agentRole) ?? 0;

		if (!events || cursor >= events.length) {
			return null;
		}

		const event = events[cursor];
		if (event.toolName === expectedToolName) {
			this.cursors.set(agentRole, cursor + 1);
			return event;
		}

		for (let i = cursor + 1; i < events.length; i++) {
			if (events[i].toolName === expectedToolName) {
				this.cursors.set(agentRole, i + 1);
				return events[i];
			}
		}

		return null;
	}
}

// ── IdRemapper ──────────────────────────────────────────────────────────────

/**
 * Bidirectional ID remapper that learns mappings from recorded vs actual tool
 * output, then applies them to tool inputs.
 *
 * Only compares fields that follow the ID naming convention:
 * - key === 'id'
 * - key ends with 'Id' (e.g. workflowId, executionId, credentialId)
 *
 * This avoids garbage mappings from diffing execution data, web content, etc.
 */
export class IdRemapper {
	private oldToNew = new Map<string, string>();

	/** Compare recorded vs actual output — learn new ID mappings from matching paths. */
	learn(recordedOutput: unknown, actualOutput: unknown): void {
		const recorded = this.extractIds(recordedOutput);
		const actual = this.extractIds(actualOutput);

		for (const [path, oldVal] of recorded) {
			const newVal = actual.get(path);
			if (newVal !== undefined && oldVal !== newVal) {
				this.oldToNew.set(oldVal, newVal);
			}
		}
	}

	/** Replace old (recorded) IDs with new (current-run) IDs throughout an input object. */
	remapInput(input: unknown): unknown {
		if (this.oldToNew.size === 0) return input;
		return this.deepReplace(input);
	}

	/** Replace old IDs in recorded output with current-run IDs (for Tier 2 pure-replay tools). */
	remapOutput(output: unknown): unknown {
		return this.remapInput(output);
	}

	private extractIds(obj: unknown, path = ''): Map<string, string> {
		const ids = new Map<string, string>();
		if (!obj || typeof obj !== 'object') return ids;

		if (Array.isArray(obj)) {
			for (let i = 0; i < obj.length; i++) {
				for (const [p, v] of this.extractIds(obj[i] as unknown, `${path}[${i}]`)) {
					ids.set(p, v);
				}
			}
			return ids;
		}

		for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
			const fullPath = path ? `${path}.${key}` : key;

			if (isIdKey(key)) {
				if (typeof value === 'string') {
					ids.set(fullPath, value);
				} else if (typeof value === 'number') {
					ids.set(fullPath, String(value));
				}
			} else if (Array.isArray(value)) {
				for (let i = 0; i < value.length; i++) {
					for (const [p, v] of this.extractIds(value[i] as unknown, `${fullPath}[${i}]`)) {
						ids.set(p, v);
					}
				}
			} else if (value !== null && typeof value === 'object') {
				for (const [p, v] of this.extractIds(value, fullPath)) {
					ids.set(p, v);
				}
			}
		}

		return ids;
	}

	private deepReplace(value: unknown): unknown {
		if (value === null || value === undefined) return value;

		if (typeof value === 'string') {
			let result = value;
			for (const [from, to] of this.oldToNew) {
				result = result.replaceAll(from, to);
			}
			return result;
		}

		if (typeof value === 'number') {
			const key = String(value);
			const mapped = this.oldToNew.get(key);
			if (mapped !== undefined) {
				const asNum = Number(mapped);
				return Number.isFinite(asNum) ? asNum : value;
			}
			return value;
		}

		if (Array.isArray(value)) {
			return value.map((v) => this.deepReplace(v));
		}

		if (typeof value === 'object') {
			return Object.fromEntries(
				Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, this.deepReplace(v)]),
			);
		}

		return value;
	}
}

function isIdKey(key: string): boolean {
	return key === 'id' || key.endsWith('Id');
}

// ── TraceWriter ─────────────────────────────────────────────────────────────

/**
 * Records tool call events during a recording session.
 * Events are stored in memory and can be serialized to JSONL.
 */
export class TraceWriter {
	private events: TraceEvent[] = [];

	private stepCounter = 0;

	constructor(testName: string) {
		this.events.push({
			kind: 'header',
			version: 1,
			testName,
			recordedAt: new Date().toISOString(),
		});
	}

	recordToolCall(
		agentRole: string,
		toolName: string,
		input: Record<string, unknown>,
		output: Record<string, unknown>,
	): void {
		this.events.push({
			kind: 'tool-call',
			stepId: ++this.stepCounter,
			agentRole,
			toolName,
			input,
			output,
		});
	}

	recordToolSuspend(
		agentRole: string,
		toolName: string,
		input: Record<string, unknown>,
		output: Record<string, unknown>,
		suspendPayload: Record<string, unknown>,
	): void {
		this.events.push({
			kind: 'tool-suspend',
			stepId: ++this.stepCounter,
			agentRole,
			toolName,
			input,
			output,
			suspendPayload,
		});
	}

	recordToolResume(
		agentRole: string,
		toolName: string,
		input: Record<string, unknown>,
		output: Record<string, unknown>,
		resumeData: Record<string, unknown>,
	): void {
		this.events.push({
			kind: 'tool-resume',
			stepId: ++this.stepCounter,
			agentRole,
			toolName,
			input,
			output,
			resumeData,
		});
	}

	getEvents(): TraceEvent[] {
		return [...this.events];
	}

	toJsonl(): string {
		return this.events.map((e) => JSON.stringify(e)).join('\n') + '\n';
	}
}

// ── JSONL helpers ───────────────────────────────────────────────────────────

const KNOWN_KINDS = new Set(['header', 'tool-call', 'tool-suspend', 'tool-resume']);

function isTraceEvent(value: unknown): value is TraceEvent {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
	const kind = (value as { kind?: unknown }).kind;
	return typeof kind === 'string' && KNOWN_KINDS.has(kind);
}

export function parseTraceJsonl(jsonl: string): TraceEvent[] {
	const events: TraceEvent[] = [];
	const lines = jsonl.split('\n');
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (line.trim().length === 0) continue;
		const parsed: unknown = jsonParse(line);
		if (!isTraceEvent(parsed)) {
			const kind = (parsed as { kind?: unknown } | null)?.kind;
			const detail =
				typeof kind === 'string' ? `unknown kind '${kind}'` : "missing or invalid 'kind' field";
			throw new Error(`Invalid trace event on line ${i + 1}: ${detail}`);
		}
		events.push(parsed);
	}
	return events;
}

/** Set of tool IDs that should use Tier 2 (pure replay) instead of real execution. */
export const PURE_REPLAY_TOOLS = new Set(['web-search', 'fetch-url', 'test-credential']);
