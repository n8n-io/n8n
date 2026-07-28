import type { IrreversibleMigration, MigrationContext } from '../migration-types';

/**
 * Durable-log Gate A (INS-851): backfill `instance_ai_events` for runs that
 * predate the log, so the fold-on-read history path covers every run when the
 * `N8N_INSTANCE_AI_DURABLE_LOG` default flips on in the same release. Without
 * this, threads that straddle the flip lose their old turns' trees: the fold
 * deliberately has no snapshot/log merge layer, and its whole-thread
 * stored-snapshot fallback only fires for threads with ZERO event rows.
 *
 * Synthesis rules (mirrors what the live coalescer would have written):
 * - Unit of work = stored run snapshots (`instance_ai_run_snapshots`); runs
 *   are not identifiable from messages alone. A snapshot's tree is decomposed
 *   into the canonical event sequence: `run-start`, timeline-ordered
 *   `text-block`/`reasoning-block`/`tool-call`(+terminal)/`agent-spawned`
 *   (+`agent-completed`), `run-finish`. In-flight tool calls get no terminal
 *   fact: the `run-finish` terminalizes them at fold time, preserving the
 *   "was interrupted" rendering.
 * - Runs that already have event rows are skipped, so the migration is
 *   idempotent and re-runnable (Gate B re-runs it as a safety check).
 * - Synthesized runs are always TERMINAL-COMPLETE (`run-start` paired with a
 *   `run-finish`), which structurally excludes them from the interrupted-run
 *   sweeper (`findUnfinishedRuns` matches run-start without run-finish) and
 *   from any future crash-resume. The `synthetic` marker is embedded in the
 *   payloads: run-start `messageId` and block `responseId`s carry a
 *   `backfill:` prefix, queryable without a schema change.
 * - Threads with no snapshots and no events synthesize a flat run per
 *   assistant message (pseudo-run keyed by the message id), matching the
 *   parser's flat-fallback rendering so Gate B can delete that ladder.
 * - Row `createdAt` = snapshot `createdAt` (parent-run end): the fold anchors
 *   entries on the row timestamp and the parser orphans entries dated
 *   strictly before their assistant message, so historical anchoring must be
 *   preserved. `seq` continues after the thread's current maximum; the fold
 *   sorts derived entries by `createdAt`, so mixed threads pair correctly.
 *
 * Deliberately not reproduced (degrade gracefully, documented in INS-851):
 * confirmation cards (resolved long ago; their tool calls + results ARE
 * reproduced, and re-emitting request facts would resurrect dead approval
 * prompts), per-call timing (synthesized facts share the snapshot timestamp,
 * so durations render as instant — the tree stores no segment timing to do
 * better), and langsmith feedback anchors (they live in snapshot COLUMNS,
 * which outlive Gate B until the table drops, so feedback on pre-log threads
 * keeps resolving unchanged; the Gate B anchor relocation carries them over).
 */

// ---------------------------------------------------------------------------
// Structural types for the stored tree JSON (kept local: migrations must not
// import app schema code, which evolves; the shape below is the frozen
// contract of what snapshots contained at flip time).
// ---------------------------------------------------------------------------

interface TreeToolCall {
	toolCallId?: string;
	toolName?: string;
	args?: Record<string, unknown>;
	result?: unknown;
	error?: string;
	isLoading?: boolean;
}

interface TreeTimelineEntry {
	type?: string;
	content?: string;
	toolCallId?: string;
	agentId?: string;
}

interface TreeNode {
	agentId?: string;
	role?: string;
	status?: string;
	textContent?: string;
	reasoning?: string;
	toolCalls?: TreeToolCall[];
	children?: TreeNode[];
	timeline?: TreeTimelineEntry[];
	tools?: string[];
	taskId?: string;
	kind?: string;
	title?: string;
	subtitle?: string;
	goal?: string;
	targetResource?: { type?: unknown } & Record<string, unknown>;
	tasks?: { tasks?: unknown };
	planItems?: unknown[];
	result?: string;
	error?: string;
	cancellationReason?: string;
}

export interface BackfillSnapshotRow {
	runId: string;
	messageGroupId: string | null;
	/** simple-json column: all runIds of a merged message group. */
	runIds: string[] | null;
	tree: string | null;
	createdAt: Date;
}

export interface BackfillMessageRow {
	id: string;
	role: string;
	content: string;
	createdAt: Date;
}

export interface SynthesizedRow {
	runId: string;
	type: string;
	/** JSON.stringify of the canonical InstanceAiEvent. */
	payload: string;
	createdAt: Date;
}

// ---------------------------------------------------------------------------
// Pure synthesis helpers (exported for the Gate B safety re-run and for
// offline dry-run tooling that validates the output against the real event
// schema and shared reducer).
// ---------------------------------------------------------------------------

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.length > 0;
}

/** Minimal mirror of the parser's text extraction: string content or `text` parts. */
export function extractMessageText(content: string): string {
	if (!content.startsWith('[') && !content.startsWith('{')) return content;
	try {
		const parsed: unknown = JSON.parse(content);
		if (!Array.isArray(parsed)) return content;
		return parsed
			.map((part: unknown) =>
				part !== null &&
				typeof part === 'object' &&
				(part as { type?: unknown }).type === 'text' &&
				isNonEmptyString((part as { text?: unknown }).text)
					? (part as { text: string }).text
					: '',
			)
			.join('');
	} catch {
		return content;
	}
}

function mapRunFinish(node: TreeNode): { status: string; reason?: string } {
	const inverseCancellation: Record<string, string> = {
		user: 'user_cancelled',
		timeout: 'timeout',
		shutdown: 'service_shutdown',
		interrupted: 'crash_interrupted',
	};
	switch (node.status) {
		case 'completed':
			return { status: 'completed' };
		case 'cancelled': {
			const reason = node.cancellationReason
				? inverseCancellation[node.cancellationReason]
				: undefined;
			return { status: 'cancelled', ...(reason ? { reason } : {}) };
		}
		case 'error':
			return { status: 'error', ...(node.error ? { reason: node.error } : {}) };
		default:
			// A tree frozen mid-flight (pre-sweep crash): terminal-complete is a
			// hard requirement, so it becomes an interrupted run.
			return { status: 'interrupted', reason: 'backfill_unterminated' };
	}
}

class RunSynthesizer {
	readonly rows: SynthesizedRow[] = [];

	private blockCounter = 0;

	constructor(
		private readonly runId: string,
		private readonly createdAt: Date,
	) {}

	push(type: string, agentId: string, payload: Record<string, unknown>, responseId?: string) {
		this.rows.push({
			runId: this.runId,
			type,
			payload: JSON.stringify({
				type,
				runId: this.runId,
				agentId,
				...(responseId ? { responseId } : {}),
				ts: this.createdAt.getTime(),
				payload,
			}),
			createdAt: this.createdAt,
		});
	}

	nextResponseId(): string {
		return `backfill:${this.runId}:${++this.blockCounter}`;
	}
}

function emitToolCall(synth: RunSynthesizer, agentId: string, tc: TreeToolCall): void {
	if (!isNonEmptyString(tc.toolCallId) || !isNonEmptyString(tc.toolName)) return;
	synth.push('tool-call', agentId, {
		toolCallId: tc.toolCallId,
		toolName: tc.toolName,
		args: tc.args && typeof tc.args === 'object' ? tc.args : {},
	});
	if (isNonEmptyString(tc.error)) {
		synth.push('tool-error', agentId, { toolCallId: tc.toolCallId, error: tc.error });
	} else if (tc.result !== undefined && tc.isLoading !== true) {
		synth.push('tool-result', agentId, { toolCallId: tc.toolCallId, result: tc.result });
	}
	// In-flight calls (isLoading, no result/error) get no terminal fact — the
	// synthesized run-finish terminalizes them at fold time.
}

function emitChild(
	synth: RunSynthesizer,
	parentId: string,
	child: TreeNode,
	emitNode: (node: TreeNode, agentId: string) => void,
): void {
	if (!isNonEmptyString(child.agentId)) return;
	const target =
		child.targetResource && isNonEmptyString(child.targetResource.type)
			? child.targetResource
			: undefined;
	synth.push('agent-spawned', child.agentId, {
		parentId,
		role: isNonEmptyString(child.role) ? child.role : 'agent',
		tools: Array.isArray(child.tools) ? child.tools.filter(isNonEmptyString) : [],
		...(isNonEmptyString(child.taskId) ? { taskId: child.taskId } : {}),
		...(isNonEmptyString(child.kind) ? { kind: child.kind } : {}),
		...(isNonEmptyString(child.title) ? { title: child.title } : {}),
		...(isNonEmptyString(child.subtitle) ? { subtitle: child.subtitle } : {}),
		...(isNonEmptyString(child.goal) ? { goal: child.goal } : {}),
		...(target ? { targetResource: target } : {}),
	});
	emitNode(child, child.agentId);
	// Close every terminal child. `result` is schema-required (empty string is
	// the live paths' convention). `agent-completed` carries no cancelled state,
	// so a cancelled child closes as an error with a "Cancelled" marker — the
	// same shape the live cancel path publishes. Children stored `active`
	// (crashed mid-child, pre-sweep era) stay active: that is exactly what the
	// flag-off snapshot rendered, so reproducing it is parity, not a regression.
	if (child.status === 'completed' || child.status === 'error' || child.status === 'cancelled') {
		const error = isNonEmptyString(child.error)
			? child.error
			: child.status === 'error'
				? 'Failed'
				: child.status === 'cancelled'
					? 'Cancelled'
					: undefined;
		synth.push('agent-completed', child.agentId, {
			role: isNonEmptyString(child.role) ? child.role : 'agent',
			result: isNonEmptyString(child.result) ? child.result : '',
			...(error ? { error } : {}),
		});
	}
}

function emitNodeContent(synth: RunSynthesizer, node: TreeNode, agentId: string): void {
	const toolCallsById = new Map<string, TreeToolCall>();
	for (const tc of node.toolCalls ?? []) {
		if (isNonEmptyString(tc.toolCallId)) toolCallsById.set(tc.toolCallId, tc);
	}
	const childrenById = new Map<string, TreeNode>();
	for (const child of node.children ?? []) {
		if (isNonEmptyString(child.agentId)) childrenById.set(child.agentId, child);
	}
	const emitted = new Set<string>();
	const recurse = (childNode: TreeNode, childAgentId: string) =>
		emitNodeContent(synth, childNode, childAgentId);

	const timeline = Array.isArray(node.timeline) ? node.timeline : [];
	// Mirror the reducer's normalizeLegacyReasoningTimeline: trees persisted
	// before reasoning became a timeline entry (or from the interim era where
	// the timeline carried text/tools but not reasoning) hold the text only in
	// the aggregate field. The read path unshifts it; the synthesis emits it
	// first, so the folded aggregate matches the normalized stored tree.
	const timelineHasReasoning = timeline.some(
		(entry) => entry.type === 'reasoning' && isNonEmptyString(entry.content),
	);
	if (isNonEmptyString(node.reasoning) && !timelineHasReasoning) {
		synth.push('reasoning-block', agentId, { text: node.reasoning }, synth.nextResponseId());
	}
	if (timeline.length > 0) {
		for (const entry of timeline) {
			if (entry.type === 'text' && isNonEmptyString(entry.content)) {
				synth.push('text-block', agentId, { text: entry.content }, synth.nextResponseId());
			} else if (entry.type === 'reasoning' && isNonEmptyString(entry.content)) {
				synth.push('reasoning-block', agentId, { text: entry.content }, synth.nextResponseId());
			} else if (entry.type === 'tool-call' && isNonEmptyString(entry.toolCallId)) {
				const tc = toolCallsById.get(entry.toolCallId);
				if (tc && !emitted.has(entry.toolCallId)) {
					emitted.add(entry.toolCallId);
					emitToolCall(synth, agentId, tc);
				}
			} else if (entry.type === 'child' && isNonEmptyString(entry.agentId)) {
				const child = childrenById.get(entry.agentId);
				if (child && !emitted.has(entry.agentId)) {
					emitted.add(entry.agentId);
					emitChild(synth, agentId, child, recurse);
				}
			}
		}
	} else if (isNonEmptyString(node.textContent)) {
		// Legacy snapshots without a timeline: aggregate text (the aggregate
		// reasoning was already emitted above).
		synth.push('text-block', agentId, { text: node.textContent }, synth.nextResponseId());
	}
	// Anything the timeline did not reference still renders (defensive).
	for (const [toolCallId, tc] of toolCallsById) {
		if (!emitted.has(toolCallId)) emitToolCall(synth, agentId, tc);
	}
	for (const [childAgentId, child] of childrenById) {
		if (!emitted.has(childAgentId)) emitChild(synth, agentId, child, recurse);
	}
	// Task/plan card: the tree stores the LATEST list, which is exactly what a
	// last-write-wins tasks-update carries, so one synthesized fact restores it.
	if (node.tasks && typeof node.tasks === 'object' && Array.isArray(node.tasks.tasks)) {
		synth.push('tasks-update', agentId, {
			tasks: node.tasks,
			...(Array.isArray(node.planItems) && node.planItems.length > 0
				? { planItems: node.planItems }
				: {}),
		});
	}
}

function parseTree(tree: string | null): TreeNode | null {
	if (!isNonEmptyString(tree)) return null;
	try {
		const parsed: unknown = JSON.parse(tree);
		if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
			return parsed as TreeNode;
		}
	} catch {
		// fall through
	}
	return null;
}

function synthesizeSnapshotRun(snapshot: BackfillSnapshotRow): {
	rows: SynthesizedRow[];
	status: string;
} {
	const tree = parseTree(snapshot.tree);

	const synth = new RunSynthesizer(snapshot.runId, snapshot.createdAt);
	const rootAgentId = isNonEmptyString(tree?.agentId)
		? tree.agentId
		: `orchestrator-${snapshot.runId}`;
	synth.push('run-start', rootAgentId, {
		messageId: `backfill:${snapshot.runId}`,
		...(isNonEmptyString(snapshot.messageGroupId)
			? { messageGroupId: snapshot.messageGroupId }
			: {}),
	});
	if (tree) emitNodeContent(synth, tree, rootAgentId);
	// Degenerate/unparseable trees fall through to lifecycle-only rows: the run
	// is marked backfilled (metric reaches zero) and history renders text-only,
	// matching what the flag-off path rendered for the same snapshot.
	const finish = tree ? mapRunFinish(tree) : { status: 'completed' };
	synth.push('run-finish', rootAgentId, finish);
	return { rows: synth.rows, status: finish.status };
}

function synthesizeLifecycleOnlyRun(
	runId: string,
	messageGroupId: string | null,
	status: string,
	createdAt: Date,
): SynthesizedRow[] {
	const synth = new RunSynthesizer(runId, createdAt);
	const agentId = `orchestrator-${runId}`;
	synth.push('run-start', agentId, {
		messageId: `backfill:${runId}`,
		...(isNonEmptyString(messageGroupId) ? { messageGroupId } : {}),
	});
	synth.push('run-finish', agentId, { status });
	return synth.rows;
}

function synthesizeFlatMessageRun(message: BackfillMessageRow): SynthesizedRow[] {
	const text = extractMessageText(message.content);
	if (!isNonEmptyString(text)) return [];
	const synth = new RunSynthesizer(message.id, message.createdAt);
	const agentId = `orchestrator-${message.id}`;
	synth.push('run-start', agentId, { messageId: `backfill:${message.id}` });
	synth.push('text-block', agentId, { text }, synth.nextResponseId());
	synth.push('run-finish', agentId, { status: 'completed' });
	return synth.rows;
}

/**
 * Synthesize the event rows one thread is missing. `seq` assignment is the
 * caller's job (rows are returned in insertion order).
 */
export function synthesizeThreadEvents(input: {
	snapshots: BackfillSnapshotRow[];
	assistantMessages: BackfillMessageRow[];
	existingRunIds: ReadonlySet<string>;
}): SynthesizedRow[] {
	const rows: SynthesizedRow[] = [];
	const covered = new Set<string>(input.existingRunIds);

	const snapshots = [...input.snapshots].sort(
		(a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
	);
	for (const snapshot of snapshots) {
		if (!isNonEmptyString(snapshot.runId)) continue;
		let status: string;
		if (covered.has(snapshot.runId)) {
			// Primary run already log-covered (e.g. a flag-on run merged into a
			// group with pre-log siblings): skip the tree synthesis but still
			// derive the terminal status so uncovered siblings get their
			// lifecycle rows below instead of counting as runs-without-events
			// forever.
			const tree = parseTree(snapshot.tree);
			status = tree ? mapRunFinish(tree).status : 'completed';
		} else {
			covered.add(snapshot.runId);
			const run = synthesizeSnapshotRun(snapshot);
			rows.push(...run.rows);
			status = run.status;
		}
		// Merged message groups: the tree already covers the whole group, but the
		// sibling runIds must stop counting as runs-without-events. Lifecycle-only
		// rows join the group (same messageGroupId) without duplicating content.
		for (const extraRunId of snapshot.runIds ?? []) {
			if (!isNonEmptyString(extraRunId) || covered.has(extraRunId)) continue;
			covered.add(extraRunId);
			rows.push(
				...synthesizeLifecycleOnlyRun(
					extraRunId,
					snapshot.messageGroupId,
					status,
					snapshot.createdAt,
				),
			);
		}
	}

	// Flat fallback: only when the thread has no snapshots at all AND no real
	// rows — the shape the read-time parser ladder produced from bare messages.
	if (input.snapshots.length === 0 && input.existingRunIds.size === 0) {
		const messages = [...input.assistantMessages].sort(
			(a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
		);
		for (const message of messages) {
			if (message.role !== 'assistant' || covered.has(message.id)) continue;
			covered.add(message.id);
			rows.push(...synthesizeFlatMessageRun(message));
		}
	}

	return rows;
}

// ---------------------------------------------------------------------------
// Migration
// ---------------------------------------------------------------------------

export class BackfillInstanceAiEventLog1784000000051 implements IrreversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		const snapshotsTable = escape.tableName('instance_ai_run_snapshots');
		const messagesTable = escape.tableName('instance_ai_messages');
		const eventsTable = escape.tableName('instance_ai_events');
		const threadIdColumn = escape.columnName('threadId');
		const runIdColumn = escape.columnName('runId');
		const seqColumn = escape.columnName('seq');
		const typeColumn = escape.columnName('type');
		const payloadColumn = escape.columnName('payload');
		const createdAtColumn = escape.columnName('createdAt');
		const updatedAtColumn = escape.columnName('updatedAt');

		const threadRows = await runQuery<Array<{ threadId: string }>>(`
			SELECT ${threadIdColumn} AS ${escape.columnName('threadId')}
			FROM ${snapshotsTable} GROUP BY ${threadIdColumn}
			UNION
			SELECT ${threadIdColumn} FROM ${messagesTable} GROUP BY ${threadIdColumn}
		`);

		for (const { threadId } of threadRows) {
			const existing = await runQuery<Array<{ runId: string }>>(
				`SELECT ${runIdColumn} AS ${escape.columnName('runId')}
				 FROM ${eventsTable} WHERE ${threadIdColumn} = :threadId GROUP BY ${runIdColumn}`,
				{ threadId },
			);
			const existingRunIds = new Set(existing.map((r) => r.runId));

			const snapshotRows = await runQuery<
				Array<{
					runId: string;
					messageGroupId: string | null;
					runIds: string | null;
					tree: string | null;
					createdAt: Date | string;
				}>
			>(
				`SELECT ${runIdColumn} AS ${escape.columnName('runId')},
				        ${escape.columnName('messageGroupId')} AS ${escape.columnName('messageGroupId')},
				        ${escape.columnName('runIds')} AS ${escape.columnName('runIds')},
				        ${escape.columnName('tree')} AS ${escape.columnName('tree')},
				        ${createdAtColumn} AS ${escape.columnName('createdAt')}
				 FROM ${snapshotsTable} WHERE ${threadIdColumn} = :threadId`,
				{ threadId },
			);
			const snapshots: BackfillSnapshotRow[] = snapshotRows.map((r) => ({
				runId: r.runId,
				messageGroupId: r.messageGroupId,
				runIds: parseSimpleJsonArray(r.runIds),
				tree: r.tree,
				createdAt: parseDbDate(r.createdAt),
			}));

			let assistantMessages: BackfillMessageRow[] = [];
			if (snapshots.length === 0 && existingRunIds.size === 0) {
				const messageRows = await runQuery<
					Array<{ id: string; role: string; content: string; createdAt: Date | string }>
				>(
					`SELECT ${escape.columnName('id')} AS ${escape.columnName('id')},
					        ${escape.columnName('role')} AS ${escape.columnName('role')},
					        ${escape.columnName('content')} AS ${escape.columnName('content')},
					        ${createdAtColumn} AS ${escape.columnName('createdAt')}
					 FROM ${messagesTable}
					 WHERE ${threadIdColumn} = :threadId AND ${escape.columnName('role')} = 'assistant'`,
					{ threadId },
				);
				assistantMessages = messageRows.map((r) => ({
					id: r.id,
					role: r.role,
					content: r.content,
					createdAt: parseDbDate(r.createdAt),
				}));
			}

			const synthesized = synthesizeThreadEvents({ snapshots, assistantMessages, existingRunIds });
			if (synthesized.length === 0) continue;

			const maxSeqRows = await runQuery<Array<{ maxSeq: number | string | null }>>(
				`SELECT MAX(${seqColumn}) AS ${escape.columnName('maxSeq')}
				 FROM ${eventsTable} WHERE ${threadIdColumn} = :threadId`,
				{ threadId },
			);
			let seq = Number(maxSeqRows[0]?.maxSeq ?? 0) || 0;

			for (const row of synthesized) {
				seq += 1;
				await runQuery(
					`INSERT INTO ${eventsTable}
					 (${threadIdColumn}, ${seqColumn}, ${runIdColumn}, ${typeColumn}, ${payloadColumn}, ${createdAtColumn}, ${updatedAtColumn})
					 VALUES (:threadId, :seq, :runId, :type, :payload, :createdAt, :updatedAt)`,
					{
						threadId,
						seq,
						runId: row.runId,
						type: row.type,
						payload: row.payload,
						createdAt: row.createdAt,
						updatedAt: row.createdAt,
					},
				);
			}
		}
	}
}

/**
 * Raw-query date handling. node-pg returns Date objects; sqlite returns the
 * stored UTC string WITHOUT a zone marker ('YYYY-MM-DD HH:MM:SS.mmm'), which
 * `new Date()` would parse as LOCAL time and shift every backfilled row by
 * the host's UTC offset — enough to break the parser's chronological pairing
 * against message timestamps. Normalize the string to explicit UTC.
 */
function parseDbDate(value: Date | string): Date {
	if (value instanceof Date) return value;
	const utcIso = /^\d{4}-\d{2}-\d{2} /.test(value) ? `${value.replace(' ', 'T')}Z` : value;
	return new Date(utcIso);
}

function parseSimpleJsonArray(value: string | string[] | null): string[] | null {
	if (!value) return null;
	// simple-json is a text column on both engines, but stay total in case a
	// driver ever hands back an already-parsed array.
	if (Array.isArray(value)) {
		return value.filter((v): v is string => typeof v === 'string');
	}
	try {
		const parsed: unknown = JSON.parse(value);
		return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : null;
	} catch {
		return null;
	}
}
