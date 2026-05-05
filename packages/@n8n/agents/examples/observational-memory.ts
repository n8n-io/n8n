/**
 * @n8n/agents — Observational Memory v1
 *
 * A second writer (the "observer") records ambient context — patterns,
 * gaps, transitions — into a sibling table, and a "compactor" rolls those
 * rows into a summary that gets injected into the main agent's system
 * prompt on subsequent turns. Both run out of band; the main loop never
 * blocks on them.
 *
 * The SDK provides:
 *   - storage primitives (BuiltObservationStore methods on the backend)
 *   - the orchestrator (runObservationalCycle) and read-side injection
 *   - agent.reflect() for explicit cycles
 *   - a lazy fallback at TurnStart for restart recovery
 *
 * The consumer provides:
 *   - the observe / compact functions (any LLM, any prompt)
 *   - the trigger (timer, queue, scheduler — whatever fits the runtime)
 *   - the formatContext function for prompt presentation
 *
 * To run with real LLM calls, set ANTHROPIC_API_KEY.
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
	type ObserveFn,
} from '../src';
import { createModel } from '../src/runtime/model-factory';

// ---------------------------------------------------------------------------
// Observer: a small LLM that emits JSON-line observations
// ---------------------------------------------------------------------------

const OBSERVER_INSTRUCTIONS = `You are an observer watching a conversation between a user and an assistant.
Read the recent message delta and the current rolling summary, then emit one
JSON object per line for each NOTEWORTHY observation you make.

What counts as noteworthy:
  - Patterns or transitions (e.g. user shifted topic, frustration setting in)
  - Recurring requests or rephrasings
  - Behavioural arcs across multiple messages
Skip: factual content the assistant already captured in working memory.

Output format — JSON Lines, no markdown fences. Each line is one of:
  {"kind": "observation", "text": "<one-sentence observation>"}
  {"kind": "gap", "durationMs": <number>, "text": "<short note about the gap>"}

Emit nothing if there's nothing noteworthy. Never write the rolling summary
itself — that's the compactor's job.`;

const observe: ObserveFn = async (ctx) => {
	if (ctx.deltaMessages.length === 0) return [];

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
			return `[${role}] ${text}`;
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
		system: OBSERVER_INSTRUCTIONS,
		prompt,
		// Forward telemetry to the same OTel tracer the main agent uses.
		// (For brevity, only the `isEnabled` flag is wired here; production
		// usage would also pass `tracer`, `metadata`, etc. — see
		// agent-runtime.ts:buildTelemetryOptions for the full mapping.)
		experimental_telemetry: ctx.telemetry?.enabled ? { isEnabled: true } : undefined,
	});

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
	return rows;
};

// ---------------------------------------------------------------------------
// Compactor: collapses the uncompacted tail into a new rolling summary
// ---------------------------------------------------------------------------

const COMPACTOR_INSTRUCTIONS = `You are a compactor. Read the previous rolling summary and a list of
recent observations, then output a NEW rolling summary that incorporates
the observations. Keep it concise — bullet-point style, drop superseded
items, preserve durable patterns. Plain text, no markdown fences.`;

const compact: CompactFn = async (ctx) => {
	const previous = ctx.previousSummary ? `Previous summary:\n${ctx.previousSummary}\n\n` : '';
	const recent = ctx.uncompactedRows
		.map((r) => `- ${typeof r.payload === 'string' ? r.payload : JSON.stringify(r.payload)}`)
		.join('\n');

	const { text } = await generateText({
		model: createModel('anthropic/claude-haiku-4-5'),
		system: COMPACTOR_INSTRUCTIONS,
		prompt: `${previous}Recent observations:\n${recent}\n\nNew rolling summary:`,
		// Forward telemetry to the same OTel tracer the main agent uses.
		// (For brevity, only the `isEnabled` flag is wired here; production
		// usage would also pass `tracer`, `metadata`, etc. — see
		// agent-runtime.ts:buildTelemetryOptions for the full mapping.)
		experimental_telemetry: ctx.telemetry?.enabled ? { isEnabled: true } : undefined,
	});

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

// ---------------------------------------------------------------------------
// formatContext: how the section reads in the system prompt
// ---------------------------------------------------------------------------

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const formatContext: FormatContextFn = (ctx) => {
	const lines: string[] = [];
	if (ctx.summary !== null) {
		if (ctx.isStale) {
			lines.push(
				'[NOTE] The observational summary below is older than 1 day — verify against current state before acting on it.',
			);
		}
		lines.push('## Observational summary');
		lines.push(ctx.summary);
	}
	if (ctx.recentObservations.length > 0) {
		lines.push('');
		lines.push('## Recent observations');
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

const memory = new Memory()
	.storage(new SqliteMemory({ url: 'file::memory:' }))
	.observationalMemory({
		observe,
		compact,
		compactionRowThreshold: 5,
		stalenessThresholdMs: ONE_DAY_MS,
		formatContext,
	});

const assistant = new Agent('assistant')
	.model('anthropic/claude-haiku-4-5')
	.instructions('You are a helpful assistant.')
	.memory(memory);

// ---------------------------------------------------------------------------
// Trigger: a TurnEnd → setTimeout → cancel-on-TurnStart timer.
// This is the consumer's responsibility — the SDK provides the seam, not the
// timer itself. Adapt to your runtime: workflow scheduler, cron, queue, etc.
// ---------------------------------------------------------------------------

const IDLE_TIMEOUT_MS = 60_000;

function wireIdleObserver(agent: Agent, threadId: string): { dispose: () => void } {
	let pending: NodeJS.Timeout | null = null;

	const cancel = () => {
		if (pending) {
			clearTimeout(pending);
			pending = null;
		}
	};

	const onEvent = (e: AgentEventData) => {
		if (e.type === AgentEvent.TurnStart || e.type === AgentEvent.AgentStart) {
			cancel();
		} else if (e.type === AgentEvent.TurnEnd) {
			cancel();
			pending = setTimeout(() => {
				pending = null;
				void agent.reflect({ threadId }).catch(() => {
					// reflect already routes errors through AgentEvent.Error;
					// nothing else to do here.
				});
			}, IDLE_TIMEOUT_MS);
		}
	};

	agent.on(AgentEvent.AgentStart, onEvent);
	agent.on(AgentEvent.TurnStart, onEvent);
	agent.on(AgentEvent.TurnEnd, onEvent);

	return {
		dispose: () => {
			cancel();
		},
	};
}

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

async function main() {
	console.log('=== @n8n/agents — observational memory ===\n');

	const threadId = `obs-demo-${Date.now()}`;
	const trigger = wireIdleObserver(assistant, threadId);

	try {
		console.log('Turn 1: user asks for help');
		await assistant.generate('Help me debug a flaky test.', {
			persistence: { threadId, resourceId: 'demo-user' },
		});

		console.log('Turn 2: user shifts topic');
		await assistant.generate('Actually, how do I configure SQLite for n8n?', {
			persistence: { threadId, resourceId: 'demo-user' },
		});

		console.log('Explicit reflect — no need to wait for the idle timer');
		const reflectResult = await assistant.reflect({ threadId });
		console.log(`  Reflect status: ${reflectResult.status}`);

		console.log('\nTurn 3: prompt now carries the observational summary');
		await assistant.generate('Let me return to that flaky test.', {
			persistence: { threadId, resourceId: 'demo-user' },
		});
	} catch (error) {
		console.log(`(Expected without API key) Error: ${(error as Error).message}`);
		console.log('Set ANTHROPIC_API_KEY to run with real LLM calls.');
	} finally {
		trigger.dispose();
		await assistant.close();
	}

	console.log('\n=== Complete ===');
}

main().catch(console.error);
