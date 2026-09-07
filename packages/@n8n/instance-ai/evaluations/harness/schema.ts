import { instanceAiEvalSeedDataTableSchema } from '@n8n/api-types';
import { z } from 'zod';

import {
	ConversationSeedSchema,
	SeedMessageSchema,
	expandSeedMessageShorthand,
	normalizeSeedTimestamps,
} from './conversation-seed';
import { SUPPORTED_CREDENTIAL_TYPES } from '../credentials/seeder';

/** Default `datasets` grouping for a case that omits the field — the single
 *  source of truth shared by the loader schema and the mcp-manifest tier reader. */
export const DEFAULT_DATASETS = ['full'];

/** A conversation turn's `text`: a string, or an array of lines joined with
 *  newlines. The array form lets long stage directions be authored readably
 *  (one line per element) in the JSON file; every consumer still receives a
 *  single string. Exported as the single source of truth so non-harness readers
 *  (e.g. the mcp-manifest builder) normalize identically. */
export const conversationTurnTextSchema = z
	.union([z.string(), z.array(z.string())])
	.transform((t) => (Array.isArray(t) ? t.join('\n') : t))
	// An unclosed `[` fails silently and expensively: the proxy stops seeing a
	// stage direction, so it sends the text as dialogue and the case grades a
	// conversation it was never meant to have. Easy to do in the array form,
	// where the closing bracket lands on a different line from the opening one.
	.refine((t) => !t.includes('[') || t.includes(']'), {
		message:
			'unbalanced stage direction — text opens `[` but never closes it, so the proxy would send it as dialogue instead of treating it as a direction',
	});

export const ConversationTurnSchema = z.object({
	role: z.enum(['user', 'assistant']),
	text: conversationTurnTextSchema,
	/** Hand the agent a seeded workflow with this turn, the way the editor does when
	 *  a user opens the assistant with a workflow in front of them — without it the
	 *  eval agent has to guess which workflow prose like "why is this failing?"
	 *  means, and we score a clarification failure the real user never hit.
	 *
	 *  `workflow` is the id as the seed declares it; the harness swaps in the
	 *  per-run remapped id. Opening turn only (refined below). */
	attach: z
		.object({ workflow: z.string().min(1) })
		.strict()
		.optional(),
});

const ExecutionScenarioSchema = z.object({
	name: z.string().min(1),
	description: z.string(),
	dataSetup: z.string(),
	successCriteria: z.string(),
	requires: z.string().optional(),
	/** Typed data tables to seed before this scenario executes (TRUST-311).
	 *  Unlike free-text `dataSetup`, this declares each column's type, so a string
	 *  id (`row_001`) can be seeded into a `string` column rather than being
	 *  rejected by a `number` column. Reuses the api-types seed-table schema
	 *  (extended with optional `rows`). */
	seedDataTables: z.array(instanceAiEvalSeedDataTableSchema).max(20).optional(),
});

/** Prior messages for an inline seed. Accepts a full envelope or the `{role, text}`
 *  shorthand, expanded BEFORE validation so the envelope rules apply to the
 *  expansion and error paths stay per-message (`seed.messages.2.createdAt`).
 *  Timestamps are normalized after expansion, so seeded history always presents
 *  in array order and never sorts after the live turn.
 *
 *  No `min(1)`: a fixture-only seed (a seeded project, no history) is legitimate, and
 *  the case-level refine is the single arbiter of a seed that carries nothing. A
 *  min here would also defeat the `.default([])` below — zod validates a substituted
 *  default like any other value. */
const inlineSeedMessagesSchema = z.preprocess(
	(raw) => (Array.isArray(raw) ? normalizeSeedTimestamps(expandSeedMessageShorthand(raw)) : raw),
	z.array(SeedMessageSchema),
);

/**
 * Where a case's seeded history comes from — ONE slot, so the modes are mutually
 * exclusive by construction instead of by a refine, and `mode` carries a real
 * either/or: is the seed in the case, or fetched at run time?
 *
 * The literals match lang-tracer's `metadata.seed` verbatim (TRUST-358);
 * diverging rebuilds the old→new translation layer this union exists to delete.
 * `replay` names an action next to `inline`'s location — an asymmetry we take
 * knowingly, because renaming it would break an LT HTTP body contract.
 *
 * Both arms are `.strict()`, matching the case schema: exclusivity has to fail
 * loudly, not by stripping. `{ mode: replay, threadId, messages }` would
 * otherwise parse as a valid replay seed with `messages` silently dropped —
 * the case runs unseeded and grades as if it were a build from scratch, which
 * is the misgrading the one-slot union exists to prevent.
 */
export const CaseSeedSchema = z.discriminatedUnion('mode', [
	/** Prior messages plus the workflows/tables they reference, carried in the case
	 *  body. Synthetic fixtures only — a real conversation belongs in `replay`,
	 *  which keeps its content out of the repo. Pairs with `conversation`, which
	 *  supplies the live turn. */
	/** `messages` defaults to empty so a seed can carry ONLY instance fixtures (the
	 *  project-scope shape: a seeded project exists, but the conversation under test
	 *  starts from scratch). Defaulted rather than optional so the inferred type
	 *  stays `SeedMessage[]` and every consumer keeps reading `.length`. The arm
	 *  stays a plain object — `discriminatedUnion` rejects a refined one — so the
	 *  "carries something" rule lives in the case-level refine below. */
	ConversationSeedSchema.extend({
		mode: z.literal('inline'),
		messages: inlineSeedMessagesSchema.default([]),
		/**
		 * Workflows to RUN before the graded turn, creating real execution records the
		 * agent can look up. `workflow` is the seed workflow's **id**, the same key
		 * `conversation[0].attach.workflow` uses — one rule for pointing at a seeded
		 * workflow, and it stays unambiguous without depending on seed names being unique.
		 *
		 * A failing prior run is the point rather than a problem: `hints` steers the mock
		 * layer, so a case can establish "the 06:00 run died on the HTTP node" and then ask
		 * only "it broke again". A prior run that fails does NOT fail the build.
		 */
		priorRuns: z
			.array(
				z
					.object({
						workflow: z.string().min(1),
						hints: z.string().min(1).max(2000).optional(),
					})
					.strict(),
			)
			.optional(),
	}).strict(),
	/** Reproduce a real conversation from its LangSmith trace at run time (seed =
	 *  before the live turn, live = that turn). Commits only the thread id;
	 *  workspace auto-discovered. Supplies the live turn itself, so `conversation`
	 *  is optional and continues after it. Transient (~14d trace retention). */
	z
		.object({
			mode: z.literal('replay'),
			threadId: z.string().min(1),
			project: z.string().min(1).optional(),
			/** LangSmith host the source trace lives on (dual-tenant reads during the
			 *  US→EU migration). Omit ⇒ the eval's home (EU) tenant, so existing cases
			 *  are unchanged. A US-sourced case carries the US host; the harness maps
			 *  host→key via env (LANGSMITH_API_KEY_US). */
			endpoint: z.string().url().optional(),
			/** Pin which user turn is sent live (its LangSmith run id); everything before
			 *  it is seeded. Omit ⇒ the thread's last user turn (default). */
			liveTurnRunId: z.string().min(1).optional(),
		})
		.strict(),
]);

export type CaseSeed = z.infer<typeof CaseSeedSchema>;

const evalTestCaseObjectSchema = z
	.object({
		/** Optional human-readable note on what this case is testing (esp. for behaviour cases). */
		description: z.string().optional(),
		// Optional only because a `replay` seed derives the live turn from the trace;
		// a refine() below requires it for every other case.
		conversation: z.array(ConversationTurnSchema).min(1).optional(),
		complexity: z.enum(['simple', 'medium', 'complex']),
		tags: z.array(z.string()),
		triggerType: z.enum(['manual', 'webhook', 'schedule', 'form']).optional(),
		executionScenarios: z.array(ExecutionScenarioSchema).optional(),
		messageBudget: z.number().int().positive().optional(),
		/** Optional NL assertions about the build CONVERSATION (process: clarifications, push-back,
		 *  ordering). LLM-judged from the transcript, so skipped in prebuilt/MCP runs. Counted as units. */
		processExpectations: z.array(z.string().min(1)).optional(),
		/** Optional NL assertions about the resulting WORKFLOW (outcome). LLM-judged from the workflow
		 *  and from the rendered agent/config-eval context when the build produced one, so they also
		 *  cover artifact existence/absence/content. Also run in prebuilt/MCP runs. Counted as units. */
		outcomeExpectations: z.array(z.string().min(1)).optional(),
		/**
		 * Removed in favour of the process/outcome split. Declared as a forbidden key (rather
		 * than dropped from the shape) so a legacy fixture fails loudly with a migration hint,
		 * instead of having its assertions silently stripped — which would undercount eval units
		 * and inflate the pass rate.
		 */
		buildExpectations: z
			.never({
				invalid_type_error:
					'`buildExpectations` is no longer supported — split it into `processExpectations` (about the build conversation) and `outcomeExpectations` (about the resulting workflow). See evaluations/README.md.',
			})
			.optional(),
		/**
		 * Credentials visible to this case's build. Created for real before the
		 * build and pinned as the thread's entire credential view; omitted → the
		 * build sees no credentials.
		 */
		credentials: z
			.array(
				z.object({
					// Validated against the seeder's templates so an authoring typo fails
					// at case-load time instead of per-build as an agent failure.
					type: z
						.string()
						.min(1)
						.refine((t) => SUPPORTED_CREDENTIAL_TYPES.has(t), {
							message: `unknown credential type — add a template to evaluations/credentials/seeder.ts (supported: ${[...SUPPORTED_CREDENTIAL_TYPES].join(', ')})`,
						}),
					name: z.string().min(1).optional(),
					valid: z.boolean().optional(),
					blank: z.boolean().optional(),
				}),
			)
			.optional(),
		/**
		 * Opts this case into the credential-setup BROWSER lane, and picks what the
		 * browser talks to. Replaces the old tag-pair convention, which you had to
		 * know the magic strings for and which failed silently when half-specified.
		 *
		 *   "anthropic" (any shipped fixture id) → hermetic run against a lookalike
		 *                                          page served AS the real hostname
		 *   "local"                              → REAL provider site in the
		 *                                          developer's own Chrome
		 *
		 * Omitted → no browser lane. Absence never means "real internet"; that
		 * requires choosing `local` explicitly. An unknown id fails the run with
		 * the available ids rather than silently booting nothing.
		 */
		credentialFixture: z.string().min(1).optional(),
		/** History restored before the live turn — one slot, `mode` says where it
		 *  comes from. See `CaseSeedSchema`. */
		seed: CaseSeedSchema.optional(),
		/**
		 * Logical groupings this case belongs to (e.g. `['pr', 'full']`). Used by
		 * the eval CLI's `--tier` flag and propagated to LangSmith as example
		 * splits, so subsets can be evaluated and compared independently. Defaults
		 * to `['full']` — cases without this field run in the full suite only.
		 */
		datasets: z.array(z.string()).min(1).default(DEFAULT_DATASETS),
	})
	// `.strict()` so any key outside the schema (a legacy `buildExpectations`, a typo'd
	// `outcomeExpectaiton`, etc.) fails at case-load instead of being silently stripped.
	.strict();

/** The keys n8n's case schema accepts. Exported so non-harness emitters (the
 *  lang-tracer normalizer) can WHITELIST an exported case down to exactly these —
 *  the schema is `.strict()`, so any extra key LangTracer attaches (id, name,
 *  suiteId, timestamps, …) fails the whole suite load. Whitelisting the allowed
 *  set is robust where blacklisting the few keys we happen to know today is not. */
export const WORKFLOW_TEST_CASE_KEYS = Object.keys(evalTestCaseObjectSchema.shape);

// A source for the live turn. (Seeding modes are exclusive by construction — the
// `seed` union — so the old two-refine pair is down to this one rule, keyed off
// the discriminant: only `replay` brings its own live turn.)
export const EvalTestCaseSchema = evalTestCaseObjectSchema
	.refine((c) => c.seed?.mode === 'replay' || c.conversation !== undefined, {
		message:
			'a case needs a conversation, or a seed with mode: replay (which supplies the live turn from the trace)',
	})
	// An inline seed that carries nothing restores nothing, and the case then grades
	// as an unseeded build — green for the wrong reason. `messages` is optional (a
	// fixture-only seed is legitimate), so emptiness is only wrong when EVERY slot
	// is empty.
	.refine(
		(c) =>
			c.seed?.mode !== 'inline' ||
			c.seed.messages.length > 0 ||
			c.seed.workflows.length > 0 ||
			c.seed.dataTables.length > 0 ||
			c.seed.agents.length > 0 ||
			c.seed.projects.length > 0,
		{
			message:
				'an inline seed must carry something — messages, workflows, dataTables, agents, or projects',
		},
	)
	// Rejected rather than ignored on a later turn, so a misplaced one can't silently
	// do nothing.
	.refine((c) => (c.conversation ?? []).slice(1).every((turn) => turn.attach === undefined), {
		message: 'only the first conversation turn may carry `attach` — an attachment is a hand-off',
	})
	// Grading an assistant turn that carries one would score a transcript that could
	// not have happened.
	.refine((c) => c.conversation?.[0]?.attach === undefined || c.conversation[0].role === 'user', {
		message:
			'only a `user` turn may carry `attach` — the attachment is the hand-off that opens the conversation',
	})
	// A dangling attachment would hand the agent a reference to nothing, which reads
	// as a builder failure. Only an inline seed declares workflows to point at.
	.refine(
		(c) => {
			const attached = c.conversation?.[0]?.attach?.workflow;
			if (attached === undefined) return true;
			const declared = c.seed?.mode === 'inline' ? c.seed.workflows : [];
			return declared.some((workflow) => workflow.id === attached);
		},
		{
			message:
				'`attach.workflow` must be the id of a workflow the inline seed declares — otherwise the attachment points at nothing',
		},
	)
	// The chat API refuses a message that is empty with nothing attached, so catch it
	// at load rather than mid-run as a 400 that reads like an infrastructure fault.
	// Every user turn, not just the opening; assistant turns are proxy script data
	// and never posted. Only a non-replay opening may substitute `attach` for text —
	// a replay case has no inline seed for it to point at.
	.superRefine((c, ctx) => {
		const isReplay = c.seed?.mode === 'replay';
		(c.conversation ?? []).forEach((turn, index) => {
			if (turn.role === 'assistant' || turn.text.trim().length > 0) return;
			const openingMayAttach = index === 0 && !isReplay;
			if (openingMayAttach && turn.attach !== undefined) return;
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['conversation', index, 'text'],
				message: openingMayAttach
					? 'an opening turn with empty text must carry `attach` — the chat API rejects a message that is empty with nothing attached'
					: 'a conversation turn needs text — the chat API rejects an empty message, and only a non-replay opening turn may substitute `attach`',
			});
		});
	})
	.superRefine((c, ctx) => {
		// Note: this message avoids double quotes — ZodError.message is a JSON.stringify of
		// the issue list, which would otherwise backslash-escape them and break substring/regex
		// matching against the raw error message in callers and tests.
		//
		// A prior run needs a workflow to run. Catching the typo at authoring time beats a
		// mid-build failure, which reads like an infrastructure fault rather than a typo.
		if (c.seed?.mode === 'inline' && c.seed.priorRuns?.length) {
			const declared = new Set(c.seed.workflows.map((workflow) => workflow.id));
			for (const [index, priorRun] of c.seed.priorRuns.entries()) {
				if (!declared.has(priorRun.workflow)) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						path: ['seed', 'priorRuns', index, 'workflow'],
						message: `priorRuns names workflow id "${priorRun.workflow}", which this seed does not declare. Seeded workflow ids: ${[...declared].join(', ') || '(none)'}`,
					});
				}
			}
		}
		// A case needs at least one gradable unit. Execution scenarios grade the built workflow;
		// process/outcome expectations grade the conversation, the workflow, and any non-workflow
		// artifact (agent, config-eval) rendered into the judge context.
		if (
			(c.executionScenarios?.length ?? 0) === 0 &&
			(c.processExpectations?.length ?? 0) === 0 &&
			(c.outcomeExpectations?.length ?? 0) === 0
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message:
					'a case needs at least one executionScenario, or a process/outcome expectation to grade it',
			});
		}
	});

// Inferred from the pre-`.refine()` object schema, not `EvalTestCaseSchema`.
// `.refine()` doesn't alter the inferred type, so this is identical — but resolving
// the refined `ZodEffects` chain trips "type instantiation excessively deep" under
// CI's type-aware lint (surfaces as `error`-typed field access in consumers).
export type EvalTestCaseInput = z.infer<typeof evalTestCaseObjectSchema>;
