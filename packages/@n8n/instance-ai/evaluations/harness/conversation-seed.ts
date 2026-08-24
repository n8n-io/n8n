// Conversation seeding for eval builds — the restore payload behind the case
// schema's `seed` slot. `mode: 'inline'` carries this payload in the case body;
// `mode: 'replay'` reconstructs one from a LangSmith trace at run time (see
// langsmith-seed.ts). Either way the shape below is what reaches restore-thread.

import { instanceAiEvalSeedAgentSchema } from '@n8n/api-types';
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
	/** Workflows the history references, recreated on restore. Ids must be distinct:
	 *  the restore index-aligns authored ids with their per-run remapped ones, and
	 *  `remapSeedArtifactIds` rewrites references by sequential `replaceAll` — a
	 *  duplicate would collapse both to one entry and one fresh id, so an `attach`
	 *  or a message reference would point at the wrong workflow. */
	workflows: z
		.array(SeedWorkflowSchema)
		.default([])
		.refine(
			(workflows) => new Set(workflows.map((workflow) => workflow.id)).size === workflows.length,
			{ message: 'seed workflow ids must be unique — references resolve by id' },
		),
	/** Data tables the history references, recreated (and id-rewritten) on restore. */
	dataTables: z.array(SeedDataTableSchema).default([]),
	/** Agents the history built, recreated (and bound to the thread) on restore, so
	 *  the live turn edits one that already exists. */
	agents: z.array(instanceAiEvalSeedAgentSchema).default([]),
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

/** Base for every timestamp this module stamps. A CONSTANT, not `Date.now()`: the
 *  same case must yield the same messages on every parse, or the push diff (which
 *  compares `seed`) reads a fresh timestamp as an edit and re-PATCHes the case on
 *  every run forever. Only ordering depends on these values, and fixed past slots
 *  order exactly as well. */
const SEED_EPOCH_MS = Date.parse('2020-01-01T00:00:00.000Z');

/** The slot for the message at `index` — ascending, and in the past, so array
 *  order survives a store that presents messages by `createdAt`. */
const seedStampAt = (index: number) => new Date(SEED_EPOCH_MS + index * 1000).toISOString();

/**
 * Expand `{role, text}` shorthand messages into native llm envelopes; anything
 * else passes through for the envelope schema to validate.
 *
 * Array-level rather than per-message because the stamped timestamps ascend by
 * position, so seeded history always orders before the live turn and a shorthand
 * author cannot get the ordering wrong. A full envelope keeps its own authored
 * `createdAt` — see `normalizeSeedTimestamps` for when that is overridden.
 */
export function expandSeedMessageShorthand(messages: unknown[]): unknown[] {
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
			createdAt: seedStampAt(index),
		};
	});
}

/**
 * Restamp an inline seed's timestamps when the authored ones don't present the
 * messages the way the array orders them: ascending, and entirely before the live
 * turn. Only a full envelope can get this wrong (the shorthand stamps its own
 * slots), and either failure makes the agent see its own history out of order.
 *
 * Restamps the WHOLE sequence, not just the offending entry: a per-message fix
 * reorders relative to the array (`[future A, past B]` moves only A, leaving the
 * store presenting B then A while the transcript still grades array order).
 * Authored timestamps therefore survive only when already ascending and past.
 *
 * Inline seeds only — a `replay` seed is reconstructed from a real trace and never
 * reaches this schema, so no real timestamp can be moved.
 */
export function normalizeSeedTimestamps(messages: unknown[]): unknown[] {
	const stampOf = (message: unknown): number | undefined => {
		if (!isRecord(message) || typeof message.createdAt !== 'string') return undefined;
		const at = Date.parse(message.createdAt);
		// Unparseable is the envelope schema's error to report, not ours to paper over.
		return Number.isNaN(at) ? undefined : at;
	};

	const now = Date.now();
	let previous = -Infinity;
	const presentsInArrayOrder = messages.every((message) => {
		const at = stampOf(message);
		if (at === undefined) return true;
		if (at >= now || at <= previous) return false;
		previous = at;
		return true;
	});
	if (presentsInArrayOrder) return messages;

	return messages.map((message, index) => {
		if (!isRecord(message) || stampOf(message) === undefined) return message;
		return { ...message, createdAt: seedStampAt(index) };
	});
}

// ---------------------------------------------------------------------------
// Workflow id + name remapping
// ---------------------------------------------------------------------------

/** Marks an artifact as seed-created and unique per restore, so a leftover can't
 *  be mistaken for this run's — and the eviction can only ever delete one of ours,
 *  never a real artifact or one the agent built. Shared with `seed-tables.ts`. */
const seedNameSuffix = (token: string) => ` [seed ${token}]`;

export const freshSeedNameSuffix = () => seedNameSuffix(randomUUID().slice(0, 8));

/** Matches a suffixed name, capturing the base. Workflows and data tables both. */
export const SEED_NAME_RE = /^(.*) \[seed [0-9a-f]{8}\]$/;

/** n8n's name-column bound. */
const MAX_SEED_NAME = 128;

export function uniquifySeedName(name: string, suffix: string): string {
	return `${name.slice(0, MAX_SEED_NAME - suffix.length)}${suffix}`;
}

/** The base a declared name will actually carry once suffixed. Eviction matches on
 *  the stored base, so it has to truncate the declared name the same way or a long
 *  name never matches its own leftover. */
export const seedNameBase = (name: string) =>
	name.slice(0, MAX_SEED_NAME - seedNameSuffix('0'.repeat(8)).length);

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
 * Give every seeded workflow and agent a fresh id — and every workflow a
 * per-restore unique name — rewriting all references across the seed, so parallel
 * iterations don't share (and clobber) one row, and a leftover workflow copy can't
 * be grounded on by name.
 *
 * Agents get the id pass only: they are addressed by id, and an agent's name
 * appears inside skill prose, where a blanket rename would rewrite instructions
 * the case grades.
 *
 * The workflow name rewrite is applied to `messages` ONLY, never inside
 * `workflows[].nodes` — names are short and human ("Batch loop"), so a blanket
 * replace could hit a same-named node and silently alter the restored graph.
 */
export function remapSeedArtifactIds(seed: ConversationSeed): ConversationSeed {
	if (seed.workflows.length === 0 && seed.agents.length === 0) return seed;

	// Duplicates collapse in the id Set below, so both entries take ONE fresh id and
	// the restore's second `create` on that pinned id aborts the whole seed. Refuse
	// here rather than fail mid-restore — `workflows` has no such invariant either,
	// but its duplicate NAMES are already refused further down.
	const agentIds = seed.agents.map((agent) => agent.id);
	const duplicateAgentId = agentIds.find((id, index) => agentIds.indexOf(id) !== index);
	if (duplicateAgentId !== undefined) {
		throw new Error(
			`Seed declares two agents with id "${duplicateAgentId}". Each seeded agent is created at ` +
				'its pinned id, so the second would abort the restore — give them distinct ids',
		);
	}

	// Workflows and agents share one id space: a fresh id must miss every original,
	// or this sequential replace could rewrite a not-yet-processed artifact's id.
	const originalIds = new Set([
		...seed.workflows.map((workflow) => workflow.id),
		...seed.agents.map((agent) => agent.id),
	]);
	let serialized = JSON.stringify({
		messages: seed.messages,
		workflows: seed.workflows,
		agents: seed.agents,
	});
	// Longest id first, for the same reason the name pass below sorts: if one id were a
	// prefix of another ("abcdefgh" / "abcdefgh12"), rewriting the short one first would
	// eat the long one's prefix and leave it with a derived id no later pass matches.
	for (const id of [...originalIds].sort((a, b) => b.length - a.length)) {
		// Artifact ids are long random tokens; a short id would risk rewriting
		// unrelated substrings, so refuse instead of corrupting the seed.
		if (id.length < 8) {
			throw new Error(`Seed artifact id "${id}" is too short to remap safely (need ≥8 chars)`);
		}
		let newId = generateNanoId();
		while (originalIds.has(newId)) newId = generateNanoId();
		serialized = serialized.replaceAll(id, newId);
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
	const workflows = remapped.workflows.map((workflow) => ({
		...workflow,
		name: uniquifySeedName(workflow.name, freshSeedNameSuffix()),
	}));

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

	// A seeded agent's workflow tool addresses its workflow by DISPLAY NAME, so it
	// has to follow the rename too or the restored agent points at a workflow that
	// no longer exists under that name. Exact lookup, not the prose regex: the
	// field holds nothing but the name.
	const agents = remapped.agents.map((agent) => ({
		...agent,
		config: {
			...agent.config,
			...(agent.config.tools
				? {
						tools: agent.config.tools.map((tool) => {
							if (tool.type !== 'workflow') return tool;
							const renamed = renames.get(tool.workflow);
							return renamed ? { ...tool, workflow: renamed } : tool;
						}),
					}
				: {}),
		},
	}));

	// Data table ids are remapped server-side on restore (id is generated, not
	// pinnable), so carry them through untouched here.
	return {
		...remapped,
		messages,
		workflows,
		agents,
		source: seed.source,
		dataTables: seed.dataTables,
	};
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
	// `skippedNodes` is the pre-split key, kept so seeded fixtures recorded then still parse.
	const setupOutcomeKeys = [
		'completedNodes',
		'nodesStillNeedingSetup',
		'skippedByUser',
		'skippedNodes',
	];
	if (!output || !setupOutcomeKeys.some((key) => Array.isArray(output[key]))) {
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

/**
 * The agent a seeded history LAST targeted — the one the restored thread continues,
 * and so the one a case grades and executes.
 *
 * Mirrors the server's own binding rule (`seedAgentBuilderTargetMetadata`): the last
 * resolved `build-agent` call, ordered by `(createdAt, id)` because that is how the
 * message store reads a thread back. Seed-ARRAY order is an authoring artifact, so a
 * parent/helper seed would otherwise have the harness grade one agent while the
 * thread continues the other.
 */
export function activeSeedAgentId(seed: ConversationSeed): string | undefined {
	const stamp = (m: Record<string, unknown>) => {
		const raw = m.createdAt;
		if (typeof raw !== 'string') return 0;
		const parsed = Date.parse(raw);
		return Number.isNaN(parsed) ? 0 : parsed;
	};
	const idOf = (m: Record<string, unknown>) => (typeof m.id === 'string' ? m.id : '');
	let active: string | undefined;
	for (const message of [...seed.messages].sort(
		(a, b) => stamp(a) - stamp(b) || idOf(a).localeCompare(idOf(b)),
	)) {
		if (!Array.isArray(message.content)) continue;
		for (const block of message.content) {
			if (!isRecord(block) || block.type !== 'tool-call') continue;
			if (block.toolName !== ORCHESTRATION_TOOL_IDS.BUILD_AGENT) continue;
			const output = isRecord(block.output) ? block.output : undefined;
			if (typeof output?.agentId === 'string') active = output.agentId;
		}
	}
	return active;
}
