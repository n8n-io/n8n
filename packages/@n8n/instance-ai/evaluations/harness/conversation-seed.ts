// Conversation seeding for eval builds — backs the `conversationSeed` (synthetic)
// and `priorConversation` (prose) paths. Real conversations use `seedThread`
// (reconstructed from a LangSmith trace; see langsmith-seed.ts).

import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { isRecord } from '@n8n/utils/is-record';
import { jsonParse } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { DOMAIN_TOOL_IDS, ORCHESTRATION_TOOL_IDS } from '../../src/tools/tool-ids';
import {
	extractAskUserAnswers,
	extractAskUserQuestions,
	extractPlanTasks,
	extractSetupCardRequests,
	extractSetupWizardOutcome,
} from '../outcome/transcript-from-events';
import type { ConversationTurn, TranscriptStep, TranscriptTurn } from '../types';

// ---------------------------------------------------------------------------
// Seed schema
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

/** A content block. Only `type` is ours to require — the block shapes belong to
 *  the agent's message store, so an unrecognised one is accepted and simply not
 *  interpreted. `.passthrough()` is load-bearing: `z.object` strips unknown keys,
 *  which would silently gut `toolCallId`/`input`/`output` from every tool call. */
const SeedMessageBlockSchema = z
	.object({
		type: z.string().min(1, 'a content block needs a non-empty `type`'),
	})
	.passthrough();

/** A message envelope. Validated because a hand-authored seed is now the primary
 *  path, and a malformed message is stored verbatim AND skipped by
 *  `transcriptPrefixFromSeed` — so the case grades against a transcript that
 *  doesn't match what the agent actually saw. Envelope only; block internals are
 *  the store's contract, not ours. */
const seedMessageObjectSchema = z
	.object({
		id: z.string().min(1),
		// Restricted to the two roles the transcript builder renders: any other
		// value is guaranteed to vanish from the judge transcript, which is the
		// exact silent failure this schema exists to catch. If the message store
		// gains a role, the builder needs updating too — fail loudly then.
		// Optional in the shape because a `custom` message carries no role; the
		// refine below requires it for every message that is actually rendered.
		role: z.enum(['user', 'assistant']).optional(),
		/** The store's own discriminator (`llm`, `custom`, …) — not enumerated. */
		type: z.string().min(1),
		/** Ordering before the live turn depends on this being a real timestamp. */
		createdAt: z
			.string()
			.min(1)
			.refine((v) => !Number.isNaN(Date.parse(v)), {
				message: 'must be a parseable timestamp (e.g. an ISO 8601 string)',
			}),
		content: z.array(SeedMessageBlockSchema).optional(),
	})
	.passthrough();

/** Inferred from the pre-`superRefine` shape — identical type, but resolving the
 *  refined `ZodEffects` chain trips "type instantiation excessively deep" under
 *  CI's type-aware lint (same reason as `EvalTestCaseInput` in schema.ts). */
export type SeedMessage = z.infer<typeof seedMessageObjectSchema>;

const SeedMessageSchema = seedMessageObjectSchema.superRefine((message, ctx) => {
	// `custom` messages are stored but never rendered (no role, any content
	// shape). Everything else is read by the transcript builder, which needs a
	// role it renders and an array of blocks.
	if (message.type === 'custom') return;
	if (message.role === undefined) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ['role'],
			message:
				'is required (only `type: custom` messages may omit it — they are stored but never rendered)',
		});
	}
	if (!Array.isArray(message.content)) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ['content'],
			message:
				'must be an array of content blocks (only `type: custom` messages may omit it — they are stored but never rendered)',
		});
	}
});

export const ConversationSeedSchema = z.object({
	/** Provenance (thread id, instance, export time) — informational only. */
	source: z.record(z.unknown()).optional(),
	/** Native agent message log (user/assistant turns with resolved tool-call blocks). */
	messages: z.array(SeedMessageSchema).min(1),
	/** Workflows the history references, recreated on restore. */
	workflows: z.array(SeedWorkflowSchema).default([]),
	/** Data tables the history references, recreated (and id-rewritten) on restore. */
	dataTables: z.array(SeedDataTableSchema).default([]),
});

export type ConversationSeed = z.infer<typeof ConversationSeedSchema>;

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
	if (call.toolName !== DOMAIN_TOOL_IDS.ASK_USER || !Array.isArray(questions)) return null;
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
	if (call.toolName !== ORCHESTRATION_TOOL_IDS.CREATE_TASKS || !Array.isArray(tasks)) return null;
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

// A HITL confirmation other than ask-user/setup-card (plan-review, resource decision, …):
// the request is in the resume block's input, the decision in its output.
const interpretConfirmation: SeedStepInterpreter = (call) => {
	const reasonRaw = call.input?.resumeReason ?? call.input?.inputType;
	const resumeReason = typeof reasonRaw === 'string' ? reasonRaw : undefined;
	if (!resumeReason || resumeReason === 'questions' || Array.isArray(call.input?.setupRequests)) {
		return null;
	}
	const toolNameRaw = call.input?.toolName;
	const messageRaw = call.input?.message;
	const approvedRaw = call.output?.approved;
	const feedbackRaw = call.output?.feedback;
	return {
		kind: 'confirmation',
		toolName: typeof toolNameRaw === 'string' ? toolNameRaw : call.toolName,
		resumeReason,
		approved: typeof approvedRaw === 'boolean' ? approvedRaw : undefined,
		// Plan-review prompts are boilerplate; the plan renders separately.
		message:
			resumeReason === 'plan-review' || typeof messageRaw !== 'string' ? undefined : messageRaw,
		feedback: typeof feedbackRaw === 'string' ? feedbackRaw : undefined,
	};
};

const SEED_STEP_INTERPRETERS: SeedStepInterpreter[] = [
	interpretAskUser,
	interpretPlan,
	interpretSetupWizard,
	interpretSetupCard,
	interpretConfirmation,
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
