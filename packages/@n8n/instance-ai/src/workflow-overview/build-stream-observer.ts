/**
 * Live tap over the agent stream that watches workflow source code while it
 * is still being WRITTEN as tool-call arguments (`build-workflow.sourceCode`,
 * `workspace_write_file.content`) and extracts coarse structural facts from
 * the partial code — before the tool call even completes. Feeds the
 * workflow-overview sidecar so the panel can show something meaningful while
 * the assistant is mid-generation (PoC).
 *
 * Scanning is deliberately shallow: node type ids and the workflow name are
 * the only facts regex-recoverable from an incomplete TS/JSON source without
 * a real parser. Scans run on a geometric growth schedule so cost stays
 * O(log n) partial-JSON parses per tool call. Fails soft everywhere — this
 * sits on the hot streaming path and must never break the run.
 */
import { isRecord } from '@n8n/utils/is-record';

import { isTriggerType, type TriggerNodeMetaProvider } from './trigger-facts';
import type { Logger } from '../logger';

/** Coarse facts recoverable from a partially written workflow source. */
export interface BuildStreamFacts {
	/** From `workflow('slug', 'Name')` in the code, or the tool's `name` arg. */
	workflowName?: string;
	/** Node type ids in order of first appearance, deduped. */
	nodeTypes: string[];
}

/** Tool calls whose streamed arguments carry workflow source code. */
const TRACKED_TOOLS = new Set(['build-workflow', 'workspace_write_file']);

/** First scan waits for this many argument chars (imports rarely hold facts). */
const INITIAL_SCAN_THRESHOLD = 1024;
/** Geometric rescan schedule: next scan at len*factor (min +512 chars). */
const SCAN_GROWTH_FACTOR = 1.5;
/** Stop buffering pathological arg streams beyond this size. */
const MAX_TRACKED_ARG_CHARS = 512 * 1024;

/**
 * `type:`/`"type":` values that look like n8n node type ids — requires a
 * dotted package-qualified shape (`n8n-nodes-base.slack`,
 * `@n8n/n8n-nodes-langchain.chatTrigger`), which filters JSON connection
 * types ('main'), Set-assignment types ('string'), and similar false hits.
 */
const NODE_TYPE_KEY_RE = /["']?type["']?\s*:\s*(["'])([^"'\n]+)\1/g;
const NODE_TYPE_VALUE_RE = /^(?:@[\w-]+\/)?[\w-]+(?:\.[\w-]+)+$/;

/** Second argument of `workflow('slug', 'Name')` — the human workflow name. */
const WORKFLOW_NAME_RE = /\bworkflow\(\s*(['"])(?:(?!\1).)*\1\s*,\s*(['"])((?:(?!\2).)*)\2/;

/**
 * Extract facts from a (possibly incomplete) workflow source string. Pure and
 * tolerant: truncated code simply yields fewer facts, never an error.
 */
export function extractBuildStreamFacts(source: string): BuildStreamFacts {
	const nodeTypes: string[] = [];
	const seen = new Set<string>();
	for (const match of source.matchAll(NODE_TYPE_KEY_RE)) {
		const value = match[2];
		if (!NODE_TYPE_VALUE_RE.test(value) || seen.has(value)) continue;
		seen.add(value);
		nodeTypes.push(value);
	}

	const nameMatch = WORKFLOW_NAME_RE.exec(source);
	const trimmedName = nameMatch?.[3]?.trim();
	const workflowName = trimmedName && trimmedName.length > 0 ? trimmedName : undefined;

	return { workflowName, nodeTypes };
}

/** `n8n-nodes-base.httpRequest` → "Http Request" (registry-less fallback). */
function labelFromType(type: string): string {
	const bare = type.split('.').pop() ?? type;
	const spaced = bare
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
	return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Render facts as the `<build-in-progress>` prompt section for the overview
 * generator. Registry display names when a meta provider is supplied; name
 * heuristics otherwise. Returns null when there is nothing meaningful to say.
 */
export function renderBuildInProgressFacts(
	facts: BuildStreamFacts,
	meta?: TriggerNodeMetaProvider,
): string | null {
	if (facts.nodeTypes.length === 0) return null;
	const labels = facts.nodeTypes.map((type) => {
		const nodeMeta = meta?.getNodeMeta(type);
		const label = nodeMeta?.displayName ?? labelFromType(type);
		const isTrigger = nodeMeta ? nodeMeta.isTrigger : isTriggerType(type);
		return isTrigger ? `${label} (trigger)` : label;
	});
	const lines: string[] = [];
	if (facts.workflowName) lines.push(`Workflow name: ${facts.workflowName}`);
	lines.push(`Nodes in the code so far, in order: ${labels.join(', ')}`);
	return lines.join('\n');
}

/** Workflow source files by convention: src/workflows/*.workflow.ts (or .json). */
function isWorkflowSourcePath(path: string): boolean {
	return /(^|\/)workflows\//.test(path) || /\.workflow\.(ts|tsx|json)$/.test(path);
}

/**
 * Pick the workflow source (and optional name) out of complete or partial
 * tool args. Returns null when the args cannot (yet) be attributed to a
 * workflow source file.
 */
function readWorkflowSourceArgs(
	toolName: string,
	args: Record<string, unknown>,
): { source?: string; argName?: string } | null {
	if (toolName === 'build-workflow') {
		return {
			source: typeof args.sourceCode === 'string' ? args.sourceCode : undefined,
			argName: typeof args.name === 'string' ? args.name : undefined,
		};
	}
	// workspace_write_file — only workflow source files are interesting, and
	// the path must be visible before content can be attributed.
	const path = typeof args.path === 'string' ? args.path : undefined;
	if (path === undefined || !isWorkflowSourcePath(path)) return null;
	return { source: typeof args.content === 'string' ? args.content : undefined };
}

interface TrackedToolCall {
	toolName: string;
	buffer: string;
	nextScanAt: number;
	scanning: boolean;
	lastFingerprint?: string;
	overflowed: boolean;
}

export interface WorkflowBuildStreamObserverDeps {
	logger: Logger;
	/** New meaningful facts appeared in the partial code (already deduped). */
	onFacts: (facts: BuildStreamFacts) => void;
	/** A build-workflow call settled successfully — the workflow is saved. */
	onWorkflowSaved: () => void;
}

/**
 * Per-stream-pass observer. `observe()` is synchronous and never throws;
 * partial-JSON scans run detached. A fresh instance per pass is fine: emission
 * dedupe is per tool call here, and the sidecar's bundle-hash dedupe absorbs
 * any re-emission across resumed passes.
 */
export class WorkflowBuildStreamObserver {
	private readonly tracked = new Map<string, TrackedToolCall>();

	private readonly inFlightScans = new Set<Promise<void>>();

	constructor(private readonly deps: WorkflowBuildStreamObserverDeps) {}

	observe(chunk: unknown): void {
		try {
			this.observeInner(chunk);
		} catch (error) {
			this.deps.logger.debug('Build-stream observer failed to process chunk', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/** Resolves once all in-flight partial-code scans have settled. */
	async settle(): Promise<void> {
		while (this.inFlightScans.size > 0) {
			await Promise.all([...this.inFlightScans]);
		}
	}

	private observeInner(chunk: unknown): void {
		if (!isRecord(chunk) || typeof chunk.type !== 'string') return;

		switch (chunk.type) {
			case 'tool-input-start': {
				if (typeof chunk.toolCallId !== 'string' || typeof chunk.toolName !== 'string') return;
				if (!TRACKED_TOOLS.has(chunk.toolName)) return;
				this.tracked.set(chunk.toolCallId, {
					toolName: chunk.toolName,
					buffer: '',
					nextScanAt: INITIAL_SCAN_THRESHOLD,
					scanning: false,
					overflowed: false,
				});
				return;
			}
			case 'tool-input-delta': {
				if (typeof chunk.toolCallId !== 'string' || typeof chunk.delta !== 'string') return;
				const call = this.tracked.get(chunk.toolCallId);
				if (!call || call.overflowed) return;
				if (call.buffer.length + chunk.delta.length > MAX_TRACKED_ARG_CHARS) {
					call.overflowed = true;
					this.deps.logger.debug('Build-stream observer stopped tracking oversized tool args', {
						toolCallId: chunk.toolCallId,
						toolName: call.toolName,
					});
					return;
				}
				call.buffer += chunk.delta;
				this.maybeScan(call);
				return;
			}
			case 'tool-call': {
				// Complete args — final emission from the parsed input, then untrack.
				if (typeof chunk.toolCallId !== 'string') return;
				const call = this.tracked.get(chunk.toolCallId);
				if (!call) return;
				this.tracked.delete(chunk.toolCallId);
				if (isRecord(chunk.input)) this.emitFactsFromArgs(call, chunk.input);
				return;
			}
			case 'tool-result': {
				if (chunk.toolName !== 'build-workflow') return;
				if (chunk.isError === true || chunk.canceled === true) return;
				try {
					this.deps.onWorkflowSaved();
				} catch (error) {
					this.deps.logger.debug('Build-stream onWorkflowSaved callback failed', {
						error: error instanceof Error ? error.message : String(error),
					});
				}
				return;
			}
			default:
				return;
		}
	}

	private maybeScan(call: TrackedToolCall): void {
		if (call.scanning || call.buffer.length < call.nextScanAt) return;
		call.scanning = true;
		const scan = this.runScan(call)
			.catch((error: unknown) => {
				this.deps.logger.debug('Build-stream partial-code scan failed', {
					toolName: call.toolName,
					error: error instanceof Error ? error.message : String(error),
				});
			})
			.finally(() => {
				call.scanning = false;
				this.inFlightScans.delete(scan);
				// Deltas kept arriving while scanning — catch up if past the threshold.
				this.maybeScan(call);
			});
		this.inFlightScans.add(scan);
	}

	private async runScan(call: TrackedToolCall): Promise<void> {
		const snapshot = call.buffer;
		call.nextScanAt = Math.max(
			Math.ceil(snapshot.length * SCAN_GROWTH_FACTOR),
			snapshot.length + 512,
		);
		const { parsePartialJson } = await import('ai');
		const { value } = await parsePartialJson(snapshot);
		if (!isRecord(value)) return;
		this.emitFactsFromArgs(call, value);
	}

	private emitFactsFromArgs(call: TrackedToolCall, args: Record<string, unknown>): void {
		const read = readWorkflowSourceArgs(call.toolName, args);
		if (!read?.source) return;
		const facts = extractBuildStreamFacts(read.source);
		if (!facts.workflowName && read.argName) facts.workflowName = read.argName;
		if (facts.nodeTypes.length === 0) return;
		const fingerprint = `${facts.workflowName ?? ''}|${facts.nodeTypes.join(',')}`;
		if (fingerprint === call.lastFingerprint) return;
		call.lastFingerprint = fingerprint;
		try {
			this.deps.onFacts(facts);
		} catch (error) {
			this.deps.logger.debug('Build-stream onFacts callback failed', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
}
