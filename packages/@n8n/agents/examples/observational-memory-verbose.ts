/**
 * @n8n/agents — Observational memory: verbose run
 *
 * Same wiring as observational-memory.ts, but with realistic conversation
 * data and visible printouts for everything the observer + compactor do.
 * Use this when you want to *see* what the system records: which messages
 * the observer reads, which rows it writes, when the compactor runs, and
 * what the rolling summary collapses to.
 *
 * Set ANTHROPIC_API_KEY (or use Node's --env-file=.env) and run:
 *
 *   node --env-file=.env --import tsx \
 *     packages/@n8n/agents/examples/observational-memory-verbose.ts
 */
import { generateText } from 'ai';

import {
	Agent,
	AgentEvent,
	Memory,
	OBSERVATION_SCHEMA_VERSION,
	SqliteMemory,
	type AgentEventData,
	type CompactFn,
	type FormatContextFn,
	type NewObservation,
	type Observation,
	type ObserveFn,
} from '../src';
import { createModel } from '../src/runtime/model-factory';

// ---------------------------------------------------------------------------
// Realistic conversation: a user wandering through three loosely-related
// debugging questions, with one deliberate topic shift.
// ---------------------------------------------------------------------------

const SCRIPT: string[] = [
	"My n8n workflow is failing at the HTTP Request node — it returns 401 every other run, never consistent. I've tried regenerating the credential twice. What should I check?",
	"I checked the credential — it's an OAuth2 token that auto-refreshes. The 401s happen exactly when the token rotates. Coincidence?",
	"OK that fits — I'll add a retry. But more broadly: do you ever just want to chuck the whole thing and go gardening?",
	"Anyway, back to the workflow. I added the retry but now I'm seeing duplicate executions in my Postgres sink. Is the retry causing it, or is something else going on?",
	"Got it — idempotency key. Let me also ask: how do I expose a webhook URL behind n8n's reverse proxy so the OAuth callback works?",
];

// ---------------------------------------------------------------------------
// Observer: prints the input it sees and the rows it writes
// ---------------------------------------------------------------------------

const OBSERVER_PROMPT = `You are an observer watching a conversation between a user and an
assistant. Read the recent message delta and the current rolling summary,
then emit JSON-Lines for noteworthy observations.

Noteworthy:
  - Recurring patterns or rephrased asks (the user keeps trying X)
  - Topic shifts (user pivoted from A to B)
  - Frustration / fatigue signals
  - Behavioural arcs that span multiple messages

Skip factual content the assistant already captured in working memory.

Output: one JSON object per line, no fences:
  {"kind": "observation", "text": "<one sentence>"}
  {"kind": "gap", "durationMs": <number>, "text": "<short note>"}

Emit nothing if there's nothing worth recording.`;

const observe: ObserveFn = async (ctx) => {
	console.log('\n──── observer.observe() ────');
	console.log(`  delta: ${ctx.deltaMessages.length} messages`);
	if (ctx.currentSummary) {
		console.log(`  current summary: ${ctx.currentSummary.split('\n')[0].slice(0, 80)}…`);
	} else {
		console.log('  current summary: (none)');
	}

	const transcript = ctx.deltaMessages
		.map((m) => {
			const text =
				'content' in m && Array.isArray(m.content)
					? m.content
							.filter((c): c is { type: 'text'; text: string } => c.type === 'text')
							.map((c) => c.text)
							.join(' ')
					: '';
			const role = 'role' in m ? m.role : 'unknown';
			return `[${role}] ${text.slice(0, 200)}`;
		})
		.join('\n');

	const prompt = [
		ctx.currentSummary ? `Current rolling summary:\n${ctx.currentSummary}\n` : '',
		`Recent messages:\n${transcript}`,
	]
		.filter(Boolean)
		.join('\n');

	const { text } = await generateText({
		model: createModel('anthropic/claude-haiku-4-5'),
		system: OBSERVER_PROMPT,
		prompt,
	});

	console.log(`  observer raw output:\n${indent(text, '    ')}`);

	const rows: NewObservation[] = [];
	const now = new Date();
	for (const line of text.split('\n')) {
		const trimmed = line.trim();
		if (!trimmed) continue;
		try {
			const parsed = JSON.parse(trimmed) as { kind?: string; text?: string; durationMs?: number };
			if (!parsed.kind || !parsed.text) continue;
			rows.push({
				scopeKind: 'thread',
				scopeId: ctx.cursor?.scopeId ?? '',
				kind: parsed.kind === 'gap' ? 'gap' : 'observation',
				payload: parsed.text,
				durationMs: typeof parsed.durationMs === 'number' ? parsed.durationMs : null,
				schemaVersion: OBSERVATION_SCHEMA_VERSION,
				createdAt: now,
				compactedAt: null,
			});
		} catch {
			// skip malformed lines
		}
	}

	console.log(`  parsed ${rows.length} row(s):`);
	for (const r of rows) console.log(`    [${r.kind}] ${r.payload as string}`);

	return rows;
};

// ---------------------------------------------------------------------------
// Compactor: prints what it sees and what it produces
// ---------------------------------------------------------------------------

const COMPACTOR_PROMPT = `You are a compactor. Read the previous rolling summary and a list of
recent observations, then output a NEW rolling summary that incorporates
the observations. Bullet-point style, drop superseded items, preserve
durable patterns. Plain text, no markdown fences.`;

const compact: CompactFn = async (ctx) => {
	console.log('\n──── compactor.compact() ────');
	console.log(`  uncompacted rows: ${ctx.uncompactedRows.length}`);
	console.log(
		`  previous summary: ${ctx.previousSummary?.split('\n')[0].slice(0, 80) ?? '(none)'}…`,
	);
	for (const r of ctx.uncompactedRows) {
		console.log(`    [${r.kind}] ${r.payload as string}`);
	}

	const previous = ctx.previousSummary ? `Previous summary:\n${ctx.previousSummary}\n\n` : '';
	const recent = ctx.uncompactedRows
		.map((r) => `- ${typeof r.payload === 'string' ? r.payload : JSON.stringify(r.payload)}`)
		.join('\n');

	const { text } = await generateText({
		model: createModel('anthropic/claude-haiku-4-5'),
		system: COMPACTOR_PROMPT,
		prompt: `${previous}Recent observations:\n${recent}\n\nNew rolling summary:`,
	});

	console.log(`  new rolling summary:\n${indent(text.trim(), '    ')}`);

	const scopeKind = ctx.uncompactedRows[0]?.scopeKind ?? 'thread';
	const scopeId = ctx.uncompactedRows[0]?.scopeId ?? '';
	return {
		summary: {
			scopeKind,
			scopeId,
			kind: 'summary',
			payload: text.trim(),
			durationMs: null,
			schemaVersion: OBSERVATION_SCHEMA_VERSION,
			createdAt: new Date(),
			compactedAt: null,
		},
	};
};

const formatContext: FormatContextFn = (ctx) => {
	const lines: string[] = [];
	if (ctx.summary !== null) {
		if (ctx.isStale) {
			lines.push('[NOTE] Observational summary may be stale — verify before acting.');
		}
		lines.push('## Observational summary');
		lines.push(ctx.summary);
	}
	if (ctx.recentObservations.length > 0) {
		lines.push('');
		lines.push('## Recent observations (since last compaction)');
		for (const row of ctx.recentObservations) {
			const text = typeof row.payload === 'string' ? row.payload : JSON.stringify(row.payload);
			const prefix = row.kind === 'gap' ? '⏸ ' : '• ';
			lines.push(`${prefix}${text}`);
		}
	}
	return lines.join('\n');
};

// ---------------------------------------------------------------------------
// Memory + Agent
// ---------------------------------------------------------------------------

const sqlite = new SqliteMemory({ url: 'file::memory:' });
const memory = new Memory().storage(sqlite).observationalMemory({
	observe,
	compact,
	// Low threshold so you actually see the compactor fire in a 5-turn run.
	compactionRowThreshold: 4,
	stalenessThresholdMs: 24 * 60 * 60 * 1000,
	formatContext,
});

const assistant = new Agent('verbose-assistant')
	.model('anthropic/claude-haiku-4-5')
	.instructions('You are a helpful, concise assistant. Keep replies short.')
	.memory(memory);

assistant.on(AgentEvent.Error, (e: AgentEventData) => {
	if (e.type !== AgentEvent.Error) return;
	const source = e.source ?? 'main';
	console.log(`\n[!] AgentEvent.Error (${source}): ${e.message}`);
});

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

function indent(text: string, prefix: string): string {
	return text
		.split('\n')
		.map((l) => prefix + l)
		.join('\n');
}

function previewObservations(rows: Observation[]): void {
	const summaries = rows.filter((r) => r.kind === 'summary');
	const others = rows.filter((r) => r.kind !== 'summary');
	console.log(
		`  totals: ${rows.length} rows (${summaries.length} summaries, ${others.length} others, ${
			rows.filter((r) => r.compactedAt !== null).length
		} compacted)`,
	);
	for (const r of rows) {
		const flag = r.compactedAt ? '∅' : '·';
		const text = typeof r.payload === 'string' ? r.payload : JSON.stringify(r.payload);
		console.log(`  ${flag} [seq=${r.seq} ${r.kind}] ${text.slice(0, 100)}`);
	}
}

async function main() {
	console.log('=== @n8n/agents — observational memory (verbose) ===');

	const threadId = `obs-verbose-${Date.now()}`;

	for (let i = 0; i < SCRIPT.length; i++) {
		const userMessage = SCRIPT[i];
		console.log(`\n━━━━━━━ Turn ${i + 1} ━━━━━━━`);
		console.log(`user: ${userMessage}`);
		try {
			const result = await assistant.generate(userMessage, {
				persistence: { threadId, resourceId: 'verbose-demo' },
			});
			const reply = result.messages
				.flatMap((m) => ('content' in m ? m.content : []))
				.filter((c) => c.type === 'text')
				.map((c) => ('text' in c ? c.text : ''))
				.join('');
			console.log(`assistant: ${reply.slice(0, 240)}${reply.length > 240 ? '…' : ''}`);
		} catch (error) {
			console.log(`(error) ${(error as Error).message}`);
			break;
		}

		// Force a synchronous reflect so the observer runs every turn — usually
		// you'd let the lazy fallback pick it up at the next TurnStart.
		console.log('\n→ forcing reflect()…');
		const reflectResult = await assistant.reflect({ threadId });
		console.log(`  reflect status: ${JSON.stringify(reflectResult)}`);

		const all = await sqlite.getObservations({ scopeKind: 'thread', scopeId: threadId });
		console.log('\n→ observation table after this turn:');
		previewObservations(all);
	}

	console.log('\n━━━━━━━ Final state ━━━━━━━');
	const all = await sqlite.getObservations({ scopeKind: 'thread', scopeId: threadId });
	previewObservations(all);
	const summaries = all.filter((r) => r.kind === 'summary');
	if (summaries.length > 0) {
		const latest = summaries[summaries.length - 1];
		console.log('\nLatest rolling summary:');
		console.log(indent(String(latest.payload), '  '));
	}

	await assistant.close();
	console.log('\n=== Complete ===');
}

main().catch(console.error);
