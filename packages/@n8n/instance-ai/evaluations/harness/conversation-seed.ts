// ---------------------------------------------------------------------------
// Conversation seeding for evaluation builds
//
// A seeded test case starts mid-conversation: the prior history is restored
// into the build thread before the first live message, so the eval drives only
// the turn under test. This module backs the `seedFile` (hand-authored
// synthetic fixture) and `priorConversation` (prose) paths; real conversations
// use `seedThread`, reconstructed from a LangSmith trace (see langsmith-seed.ts).
// ---------------------------------------------------------------------------

import { jsonParse } from 'n8n-workflow';
import { randomBytes, randomUUID } from 'node:crypto';
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

export const ConversationSeedSchema = z.object({
	/** Provenance (thread id, instance, export time) — informational only. */
	source: z.record(z.unknown()).optional(),
	/** Native agent message log (user/assistant turns with resolved tool-call blocks). */
	messages: z.array(z.record(z.unknown())).min(1),
	/** Workflows the history references, recreated on restore. */
	workflows: z.array(SeedWorkflowSchema).default([]),
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

/**
 * Convert authored prose turns into native llm messages. Timestamps are
 * stamped slightly in the past, ascending, so the seeded history orders
 * before the live turn (memory loads by `(createdAt, id)` and the runtime
 * stamps the live turn with the current time).
 */
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
	};
}

// ---------------------------------------------------------------------------
// Workflow id remapping
// ---------------------------------------------------------------------------

const WORKFLOW_ID_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function generateWorkflowId(): string {
	const bytes = randomBytes(16);
	let id = '';
	for (const byte of bytes) id += WORKFLOW_ID_ALPHABET[byte % WORKFLOW_ID_ALPHABET.length];
	return id;
}

/**
 * Give every seeded workflow a fresh id, rewriting all references across the
 * seed (message tool-call inputs/outputs, canvas URLs, the workflow records
 * themselves). Without this, parallel iterations of the same case would
 * restore — and then edit — one shared workflow row.
 */
export function remapSeedWorkflowIds(seed: ConversationSeed): ConversationSeed {
	if (seed.workflows.length === 0) return seed;

	let serialized = JSON.stringify({ messages: seed.messages, workflows: seed.workflows });
	for (const workflow of seed.workflows) {
		// Workflow ids are long random tokens; a short id would risk rewriting
		// unrelated substrings, so refuse instead of corrupting the seed.
		if (workflow.id.length < 8) {
			throw new Error(
				`Seed workflow id "${workflow.id}" is too short to remap safely (need ≥8 chars)`,
			);
		}
		serialized = serialized.replaceAll(workflow.id, generateWorkflowId());
	}

	const remapped = ConversationSeedSchema.parse(jsonParse(serialized));
	return { ...remapped, source: seed.source };
}

// ---------------------------------------------------------------------------
// Transcript prefix
//
// Seeded history must be visible to the expectations judge and the
// prompt-aware checks: the prior user turns are part of the case's intent,
// and the judge needs to know what already happened to evaluate what the
// live turn should do. Turns carry `seeded: true` so consumers can tell
// restored context from evaluated behaviour.
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

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

/**
 * Map a seeded tool-call block to a transcript step, mirroring the special
 * rendering the live event transcript gives `ask-user` / plan tools — otherwise
 * they'd all flatten to generic tool calls. Note: a seeded `ask-user` carries
 * the questions but not the user's answers (those arrived via resume runs the
 * reconstruction drops), so answers render as absent.
 */
function toTranscriptStep(block: Record<string, unknown>): TranscriptStep {
	const toolName = typeof block.toolName === 'string' ? block.toolName : 'unknown-tool';
	const input = isRecord(block.input) ? block.input : undefined;

	if (toolName === 'ask-user' && Array.isArray(input?.questions)) {
		const questions = extractAskUserQuestions(input.questions);
		if (questions.length > 0) {
			// The kept (resume) block carries the user's answers in its output.
			const output = isRecord(block.output) ? block.output : undefined;
			const answers = Array.isArray(output?.answers)
				? extractAskUserAnswers(output.answers)
				: undefined;
			return { kind: 'ask-user', questions, answers };
		}
	}
	if (toolName === 'create-tasks' && Array.isArray(input?.tasks)) {
		const tasks = extractPlanTasks(input.tasks);
		if (tasks.length > 0) return { kind: 'plan', tasks };
	}
	const output = isRecord(block.output) ? block.output : undefined;
	// Setup-wizard outcome: which nodes were configured / skipped (the applied
	// result of a setup card). Same rendering as the live `workflows` result.
	if (output && (Array.isArray(output.completedNodes) || Array.isArray(output.skippedNodes))) {
		const wizard = extractSetupWizardOutcome(output);
		if (wizard) return wizard;
	}
	// Setup card (the prompt): its asks live in output.payload.setupRequests. The
	// fill outcome isn't in the trace (only SSE proxy responses capture it), so
	// it renders as 'pending'.
	const payload = isRecord(output?.payload) ? output.payload : undefined;
	if (Array.isArray(payload?.setupRequests)) {
		const requests = extractSetupCardRequests(payload.setupRequests);
		if (requests.length > 0) return { kind: 'setup-card', requests, outcome: 'pending' };
	}

	return {
		kind: 'tool-call',
		toolName,
		args: input,
		result: 'output' in block ? block.output : undefined,
	};
}
