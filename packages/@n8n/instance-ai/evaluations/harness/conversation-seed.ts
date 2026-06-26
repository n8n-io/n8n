// Conversation seeding for eval builds — backs the `seedFile` (synthetic) and
// `priorConversation` (prose) paths. Real conversations use `seedThread`
// (reconstructed from a LangSmith trace; see langsmith-seed.ts).

import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { isRecord } from '@n8n/utils/is-record';
import { jsonParse } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { z } from 'zod';

import {
	extractAskUserAnswers,
	extractAskUserQuestions,
	extractPlanTasks,
	extractSetupCardRequests,
	extractSetupWizardOutcome,
} from '../outcome/transcript-from-events';
import type { ConversationTurn, TranscriptStep, TranscriptTurn } from '../types';

// ---------------------------------------------------------------------------
// Seed file schema
// ---------------------------------------------------------------------------

const SeedWorkflowSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	nodes: z.array(z.record(z.unknown())),
	connections: z.record(z.unknown()),
});

const SeedDataTableSchema = z.object({
	/** The table's id as it appears in the trace — the value baked into the
	 *  seed workflow's data-table node. Rewritten to the recreated table's id on
	 *  restore (the server generates a fresh id; it can't be pinned). */
	id: z.string().min(1),
	name: z.string().min(1),
	columns: z.array(
		z.object({ name: z.string().min(1), type: z.enum(['string', 'number', 'boolean', 'date']) }),
	),
	// Schema only — rows are intentionally not seeded (the table exists empty,
	// which is all the workflow node needs). Real rows are the highest-PII part
	// of a trace and are kept out of the eval instance entirely.
});

export const ConversationSeedSchema = z.object({
	/** Provenance (thread id, instance, export time) — informational only. */
	source: z.record(z.unknown()).optional(),
	/** Native agent message log (user/assistant turns with resolved tool-call blocks). */
	messages: z.array(z.record(z.unknown())).min(1),
	/** Workflows the history references, recreated on restore. */
	workflows: z.array(SeedWorkflowSchema).default([]),
	/** Data tables the history references, recreated (and id-rewritten) on restore. */
	dataTables: z.array(SeedDataTableSchema).default([]),
});

export type ConversationSeed = z.infer<typeof ConversationSeedSchema>;

export function loadConversationSeed(filePath: string): ConversationSeed {
	let raw: unknown;
	try {
		raw = JSON.parse(readFileSync(filePath, 'utf-8'));
	} catch (error) {
		throw new Error(
			`Failed to read conversation seed ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
	const parsed = ConversationSeedSchema.safeParse(raw);
	if (!parsed.success) {
		const issues = parsed.error.issues
			.map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
			.join('\n');
		throw new Error(`Invalid conversation seed ${filePath}:\n${issues}`);
	}
	return parsed.data;
}

// ---------------------------------------------------------------------------
// Prose prior turns → seed messages
// ---------------------------------------------------------------------------

/** Convert authored prose turns into native llm messages, stamped slightly in
 *  the past (ascending) so they order before the live turn. */
export function seedFromProse(turns: ConversationTurn[]): ConversationSeed {
	const base = Date.now() - (turns.length + 1) * 1000;
	return {
		messages: turns.map((turn, index) => ({
			id: randomUUID(),
			type: 'llm',
			role: turn.role,
			content: [{ type: 'text', text: turn.text }],
			createdAt: new Date(base + index * 1000).toISOString(),
		})),
		workflows: [],
		dataTables: [],
	};
}

// ---------------------------------------------------------------------------
// Workflow id remapping
// ---------------------------------------------------------------------------

/** Give every seeded workflow a fresh id, rewriting all references across the
 *  seed — so parallel iterations don't share (and clobber) one workflow row. */
export function remapSeedWorkflowIds(seed: ConversationSeed): ConversationSeed {
	if (seed.workflows.length === 0) return seed;

	const originalIds = new Set(seed.workflows.map((workflow) => workflow.id));
	let serialized = JSON.stringify({ messages: seed.messages, workflows: seed.workflows });
	for (const workflow of seed.workflows) {
		// Workflow ids are long random tokens; a short id would risk rewriting
		// unrelated substrings, so refuse instead of corrupting the seed.
		if (workflow.id.length < 8) {
			throw new Error(
				`Seed workflow id "${workflow.id}" is too short to remap safely (need ≥8 chars)`,
			);
		}
		// Keep the fresh id disjoint from every original id so this sequential
		// replace can't rewrite a not-yet-processed workflow's id.
		let newId = generateNanoId();
		while (originalIds.has(newId)) newId = generateNanoId();
		serialized = serialized.replaceAll(workflow.id, newId);
	}

	const remapped = ConversationSeedSchema.parse(jsonParse(serialized));
	// Data table ids are remapped server-side on restore (id is generated, not
	// pinnable), so carry them through untouched here.
	return { ...remapped, source: seed.source, dataTables: seed.dataTables };
}

// Transcript prefix — seeded history rendered for the judge/checks. Turns carry
// `seeded: true` so consumers can tell restored context from evaluated behaviour.

function textOf(blocks: unknown[]): string {
	return blocks
		.flatMap((block) =>
			isRecord(block) && block.type === 'text' && typeof block.text === 'string'
				? [block.text]
				: [],
		)
		.join('\n');
}

export function transcriptPrefixFromSeed(
	messages: Array<Record<string, unknown>>,
): TranscriptTurn[] {
	const turns: TranscriptTurn[] = [];
	const lastTurn = () => turns[turns.length - 1];

	for (const message of messages) {
		if (message.type === 'custom' || !Array.isArray(message.content)) continue;

		if (message.role === 'user') {
			turns.push({ userMessage: textOf(message.content), steps: [], seeded: true });
			continue;
		}
		if (message.role !== 'assistant') continue;

		if (turns.length === 0) turns.push({ steps: [], seeded: true });
		const steps: TranscriptStep[] = lastTurn().steps;
		const text = textOf(message.content);
		if (text) steps.push({ kind: 'agent-text', text });
		for (const block of message.content) {
			if (!isRecord(block) || block.type !== 'tool-call') continue;
			steps.push(toTranscriptStep(block));
		}
	}

	return turns;
}

/** A seeded tool-call block, normalized for the interpreters below. */
interface SeedToolCall {
	toolName: string;
	input?: Record<string, unknown>;
	output?: Record<string, unknown>;
}

/** Maps a seeded tool-call to its special transcript step (ask-user/plan/setup),
 *  mirroring the live SSE transcript. Returns null to fall through. */
type SeedStepInterpreter = (call: SeedToolCall) => TranscriptStep | null;

const interpretAskUser: SeedStepInterpreter = (call) => {
	const questions = call.input?.questions;
	if (call.toolName !== 'ask-user' || !Array.isArray(questions)) return null;
	const parsed = extractAskUserQuestions(questions);
	if (parsed.length === 0) return null;
	// The kept (resume) block carries the user's answers in its output.
	const answers = Array.isArray(call.output?.answers)
		? extractAskUserAnswers(call.output.answers)
		: undefined;
	return { kind: 'ask-user', questions: parsed, answers };
};

const interpretPlan: SeedStepInterpreter = (call) => {
	const tasks = call.input?.tasks;
	if (call.toolName !== 'create-tasks' || !Array.isArray(tasks)) return null;
	const parsed = extractPlanTasks(tasks);
	return parsed.length > 0 ? { kind: 'plan', tasks: parsed } : null;
};

// The applied setup outcome: which nodes were configured / skipped (same
// rendering as the live `workflows` result).
const interpretSetupWizard: SeedStepInterpreter = (call) => {
	const { output } = call;
	if (!output || !(Array.isArray(output.completedNodes) || Array.isArray(output.skippedNodes))) {
		return null;
	}
	return extractSetupWizardOutcome(output);
};

// The setup-card prompt: its asks live in output.payload.setupRequests. The fill
// outcome isn't in the trace (only SSE proxy responses capture it), so it
// renders as 'pending'.
const interpretSetupCard: SeedStepInterpreter = (call) => {
	const payload = isRecord(call.output?.payload) ? call.output.payload : undefined;
	const setupRequests = payload?.setupRequests;
	if (!Array.isArray(setupRequests)) return null;
	const requests = extractSetupCardRequests(setupRequests);
	return requests.length > 0 ? { kind: 'setup-card', requests, outcome: 'pending' } : null;
};

const SEED_STEP_INTERPRETERS: SeedStepInterpreter[] = [
	interpretAskUser,
	interpretPlan,
	interpretSetupWizard,
	interpretSetupCard,
];

/** Map a seeded tool-call block to a transcript step (special interpreters above,
 *  else a generic tool-call). */
function toTranscriptStep(block: Record<string, unknown>): TranscriptStep {
	const call: SeedToolCall = {
		toolName: typeof block.toolName === 'string' ? block.toolName : 'unknown-tool',
		input: isRecord(block.input) ? block.input : undefined,
		output: isRecord(block.output) ? block.output : undefined,
	};
	for (const interpret of SEED_STEP_INTERPRETERS) {
		const step = interpret(call);
		if (step) return step;
	}
	return {
		kind: 'tool-call',
		toolName: call.toolName,
		args: call.input,
		result: 'output' in block ? block.output : undefined,
	};
}
