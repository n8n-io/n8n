// Conversation seeding for eval builds — the restore payload behind the case
// schema's `seed` slot. `mode: 'inline'` carries this payload in the case body;
// `mode: 'replay'` reconstructs one from a LangSmith trace at run time (see
// langsmith-seed.ts). Either way the shape below is what reaches restore-thread.

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
		// The required_error names both authoring forms: a message that is neither a
		// full envelope nor a well-formed `{role, text}` shorthand lands here, and
		// "Required" alone wouldn't hint that the shorthand exists.
		id: z
			.string({
				required_error:
					'is required — a prior message is either a full envelope (id/role/type/createdAt/content) or the `{role, text}` shorthand',
			})
			.min(1),
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

export const SeedMessageSchema = seedMessageObjectSchema.superRefine((message, ctx) => {
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
// `{role, text}` shorthand → seed messages
// ---------------------------------------------------------------------------

/** A `{role, text}` prior message — the authoring sugar the `priorConversation`
 *  key used to be. Recognised by its EXACT key set (and valid values), so a full
 *  envelope is never mistaken for one, and a near-miss falls through to the
 *  envelope schema and gets a real error instead of being expanded into a
 *  message the transcript builder would silently drop. */
function isShorthandTurn(
	value: unknown,
): value is { role: ConversationTurn['role']; text: string | string[] } {
	if (!isRecord(value)) return false;
	const keys = Object.keys(value);
	if (keys.length !== 2 || !keys.includes('role') || !keys.includes('text')) return false;
	if (value.role !== 'user' && value.role !== 'assistant') return false;
	return (
		typeof value.text === 'string' ||
		(Array.isArray(value.text) && value.text.every((line) => typeof line === 'string'))
	);
}

/**
 * Expand `{role, text}` shorthand messages into native llm envelopes; anything
 * else passes through for the envelope schema to validate.
 *
 * Array-level rather than per-message because the stamped timestamps ascend by
 * position — slightly in the past, so seeded history always orders before the
 * live turn and a shorthand author cannot get the ordering wrong. A full
 * envelope keeps its own authored `createdAt`.
 */
export function expandSeedMessageShorthand(messages: unknown[]): unknown[] {
	const base = Date.now() - (messages.length + 1) * 1000;
	return messages.map((message, index) => {
		if (!isShorthandTurn(message)) return message;
		return {
			id: randomUUID(),
			type: 'llm',
			role: message.role,
			// Array form = lines, joined — same normalization as
			// `conversationTurnTextSchema` applies to an authored conversation turn.
			content: [
				{
					type: 'text',
					text: Array.isArray(message.text) ? message.text.join('\n') : message.text,
				},
			],
			createdAt: new Date(base + index * 1000).toISOString(),
		};
	});
}

/**
 * Pull an inline seed's timestamps back into the past when the author put any of
 * them in the future.
 *
 * The shorthand stamps its own ascending pre-live timestamps, so it can't get
 * this wrong; a full envelope keeps what it was authored with, and a future
 * stamp sorts the seeded turn AFTER the live turn — the agent then sees its own
 * history out of order, and the judge grades a transcript that never happened.
 *
 * Restamps the WHOLE sequence, not just the offending entry. A per-message clamp
 * reorders relative to the array: `[future A, past B]` leaves B alone and moves A
 * to ~now, so the store presents B then A while `transcriptPrefixFromSeed` still
 * grades array order. Array order is the authority, so the rewrite reproduces it
 * on the same ascending slots the shorthand uses. Authored timestamps are
 * therefore only preserved when every one of them is already in the past.
 *
 * Inline (hand-authored) seeds only — a `replay` seed is reconstructed from a
 * real trace and never reaches this schema, so no real timestamp can be moved.
 */
export function clampFutureSeedTimestamps(messages: unknown[]): unknown[] {
	const now = Date.now();
	const stampOf = (message: unknown): number | undefined => {
		if (!isRecord(message) || typeof message.createdAt !== 'string') return undefined;
		const at = Date.parse(message.createdAt);
		// Unparseable is the envelope schema's error to report, not ours to paper over.
		return Number.isNaN(at) ? undefined : at;
	};
	const anyFuture = messages.some((message) => (stampOf(message) ?? -Infinity) >= now);
	if (!anyFuture) return messages;

	const base = now - (messages.length + 1) * 1000;
	return messages.map((message, index) => {
		if (stampOf(message) === undefined) return message;
		return {
			...(message as Record<string, unknown>),
			createdAt: new Date(base + index * 1000).toISOString(),
		};
	});
}

// ---------------------------------------------------------------------------
// Workflow id + name remapping
// ---------------------------------------------------------------------------

/** Marks a workflow as created by a seed restore, and makes its name unique per
 *  restore. Load-bearing twice over: a leftover copy from an earlier
 *  run can no longer be mistaken for this run's workflow by name, and the suffix
 *  identifies seed artifacts precisely — so the pre-restore eviction can only ever
 *  delete one of ours, never a real workflow and never one the agent built. Same
 *  shape the server already uses for seeded data tables. */
const seedNameSuffix = (token: string) => ` [seed ${token}]`;

/** Matches a name this module produced, capturing the original base name. */
export const SEED_WORKFLOW_NAME_RE = /^(.*) \[seed [0-9a-f]{8}\]$/;

/** n8n's workflow-name column bound. */
const MAX_WORKFLOW_NAME = 128;

const escapeForRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Rewrite every string inside a parsed value, leaving structure untouched. */
/** Rewrite values under a key literally named `workflowName` — a field that by
 *  definition holds one, wherever it sits. */
function renameWorkflowNameFields(value: unknown, fn: (s: string) => string): unknown {
	if (Array.isArray(value)) return value.map((v) => renameWorkflowNameFields(v, fn));
	if (!isRecord(value)) return value;
	return Object.fromEntries(
		Object.entries(value).map(([key, v]) => [
			key,
			key === 'workflowName' && typeof v === 'string' ? fn(v) : renameWorkflowNameFields(v, fn),
		]),
	);
}

/**
 * Rewrite workflow-name mentions in one seeded message: human prose (`text`
 * blocks) and fields that explicitly hold a workflow name. Nothing else.
 *
 * Deliberately NOT every string. A message's tool-call blocks carry opaque
 * payloads — recorded SDK source, expressions, arbitrary results — and a short
 * workflow name like `Order` would also rewrite a NODE called `Order` inside
 * recorded source. That is the same integrity break the `workflows[].nodes`
 * exclusion exists to prevent, one level in: the agent would read prior context
 * describing an artifact that never existed.
 */
function renameMentions(message: SeedMessage, fn: (s: string) => string): SeedMessage {
	const named = renameWorkflowNameFields(message, fn) as SeedMessage;
	if (!Array.isArray(named.content)) return named;
	return {
		...named,
		content: named.content.map((block) =>
			isRecord(block) && block.type === 'text' && typeof block.text === 'string'
				? { ...block, text: fn(block.text) }
				: block,
		),
	} as SeedMessage;
}

/**
 * Give every seeded workflow a fresh id AND a per-restore unique name, rewriting
 * all references across the seed — so parallel iterations don't share (and
 * clobber) one workflow row, and a leftover copy can't be grounded on by name.
 *
 * The name rewrite is applied to `messages` ONLY, never inside `workflows[].nodes`.
 * Workflow names are short and human ("Batch loop"), so a blanket replace could hit
 * a node that happens to share the name and silently alter the restored graph —
 * which is exactly the "structural skeleton unchanged" guard a seeded case relies on.
 */
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

	// n8n itself allows duplicate workflow names, so a scrubbed real seed could
	// legitimately carry two. This harness can't take them: the rename below rewrites
	// mentions by matching the name text, so both workflows' mentions would collapse
	// onto the first one's new name and the history would point at the wrong workflow.
	// Refuse rather than mangle — a limit of the rewrite, not an n8n rule.
	const names = remapped.workflows.map((workflow) => workflow.name);
	const duplicate = names.find((name, index) => names.indexOf(name) !== index);
	if (duplicate !== undefined) {
		throw new Error(
			`Seed declares two workflows named "${duplicate}". The harness rewrites seed workflow ` +
				'names to keep concurrent runs apart, and it cannot tell which mention in the history ' +
				'means which workflow — give them distinct names in the fixture',
		);
	}

	// Uniquify names after the id pass, so the rename can't perturb id matching.
	const workflows = remapped.workflows.map((workflow) => {
		const suffix = seedNameSuffix(randomUUID().slice(0, 8));
		return {
			...workflow,
			name: `${workflow.name.slice(0, MAX_WORKFLOW_NAME - suffix.length)}${suffix}`,
		};
	});

	// Any mention in the seeded history follows the workflow, so the agent's own
	// record of what it built still matches what is on the instance.
	//
	// ONE pass over each string, longest original name first. Renaming per
	// workflow instead would feed each rewrite into the next: with "Order" and
	// "Order Sync", renaming "Order" first turns every "Order Sync" mention into
	// "Order [seed …] Sync", which no later pass matches — leaving the history
	// pointing at a name that was never restored. A replacement produced by this
	// pass is never rescanned, so the two can't interfere.
	const renames = new Map(
		remapped.workflows.map((workflow, index) => [workflow.name, workflows[index].name]),
	);
	const mentionRe = new RegExp(
		[...renames.keys()]
			.sort((a, b) => b.length - a.length)
			.map(escapeForRegExp)
			.join('|'),
		'g',
	);
	const rewrite = (s: string) => s.replace(mentionRe, (match) => renames.get(match) ?? match);
	const messages = remapped.messages.map((message) => renameMentions(message, rewrite));

	// Data table ids are remapped server-side on restore (id is generated, not
	// pinnable), so carry them through untouched here.
	return { ...remapped, messages, workflows, source: seed.source, dataTables: seed.dataTables };
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
