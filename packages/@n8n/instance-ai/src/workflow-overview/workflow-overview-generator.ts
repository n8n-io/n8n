/**
 * Sidecar generator for the three-pane workflow overview (Triggers / Steps /
 * Results) rendered next to the AI Assistant chat. Runs outside the agent
 * loop as a small one-shot structured LLM call (mirrors memory/title-utils).
 * Fails soft — any error returns null and the panel simply doesn't refresh.
 */
import { createModel, type BuiltTelemetry, type Telemetry } from '@n8n/agents';
import type { WorkflowOverview } from '@n8n/api-types';
import { z } from 'zod';

import type { ModelConfig } from '../types';

/** Token usage of one overview generation call. */
export interface WorkflowOverviewUsage {
	inputTokens?: number;
	outputTokens?: number;
	totalTokens?: number;
}

/** Everything the generator may ground the overview in, best evidence last. */
export interface WorkflowOverviewBundle {
	/**
	 * What the overview describes: a workflow being planned in a conversation
	 * ('plan', default — plan tense) or an existing saved workflow described
	 * from its structure ('workflow' — present tense, conversation optional).
	 */
	subject?: 'plan' | 'workflow';
	/** Recent conversation, oldest first. */
	conversation: Array<{ role: 'user' | 'assistant'; text: string }>;
	/** The user message that triggered this refresh (not yet in `conversation`). */
	latestUserMessage?: string;
	/** Structured answers from an ask-user wizard that just resolved. */
	qaAnswers?: Array<{ question: string; answer: string }>;
	/** Executor briefing spec of the plan's single build-workflow task. */
	planTaskSpec?: string;
	/** Compact facts about a workflow already built in this thread, if any. */
	builtWorkflowSummary?: string;
	/**
	 * Triggers pane already derived deterministically from the workflow
	 * structure — only meaningful with subject 'workflow'. When set, the model
	 * does not generate that pane: it receives the value as authoritative
	 * context and produces only Steps/Results.
	 */
	knownTriggers?: string;
	/**
	 * Deterministically derived Results pane — only meaningful with subject
	 * 'workflow'. Present means the pane is KNOWN, including '' ("the workflow
	 * produces no user-visible outputs"): the model does not generate it and
	 * receives the value as authoritative context.
	 */
	knownResults?: string;
	/**
	 * Partial result facts (completeness gate tripped): the model still
	 * generates the Results pane, grounded by these authoritative fragments.
	 * Mutually exclusive with `knownResults`.
	 */
	resultFactsContext?: string;
	/** The overview currently shown to the user, for stability + only-on-change. */
	previousOverview?: WorkflowOverview | null;
}

const generationSchema = z.object({
	skip: z
		.boolean()
		.describe(
			'true when the conversation is not about building or editing ONE n8n workflow ' +
				'(greetings, general questions, multi-workflow coordination), or when no pane would ' +
				'change vs the previous overview. When true, set all panes to "".',
		),
	triggers: z
		.string()
		.describe(
			'What sets the workflow off, and when/how often. One short sentence, plan tense ' +
				'(e.g. "Runs every Monday at 9:00", "When someone submits the intake form"). ' +
				'"" when not known yet.',
		),
	steps: z
		.string()
		.describe(
			'ONE plain sentence saying what happens in between — no node names or technical jargon. ' +
				'"" when not known yet.',
		),
	results: z
		.string()
		.describe(
			'What the user ends up with, described concretely (e.g. "An email to the person who ' +
				'filled in the form", "A new row in the Leads sheet"). "" when not known yet.',
		),
});

/** Variants used when the caller supplies panes: known panes have no field to generate. */
const generationSchemaWithoutTriggers = generationSchema.omit({ triggers: true });
const generationSchemaWithoutResults = generationSchema.omit({ results: true });
const generationSchemaStepsOnly = generationSchema.omit({ triggers: true, results: true });

const STEPS_RULE =
	'- steps: exactly one plain sentence; never mention n8n node names or technical jargon.';
const RESULTS_RULE =
	'- results: concrete user-visible outcomes, never vague ("a notification" is too vague; "a Slack message in #support with the ticket summary" is right).';
const OUTPUT_ONLY_RULE = '- Never answer the user or produce anything except the JSON object.';

const SHARED_RULES = [STEPS_RULE, RESULTS_RULE, OUTPUT_ONLY_RULE];

const PLAN_INSTRUCTIONS = [
	'You maintain a compact three-pane "Workflow overview" panel shown beside an AI workflow-builder chat.',
	'The panel describes the SINGLE n8n workflow currently being planned or edited in the conversation.',
	'It reads as a plan, not as a description of something that already exists.',
	'',
	'Evidence priority — higher entries win on any conflict:',
	'1. <built-workflow> facts about an already-built workflow',
	'2. <plan-task-spec> the approved or proposed plan briefing',
	'3. <qa-answers> explicit answers the user just gave',
	'4. <conversation> and <latest-user-message>',
	'',
	'Rules:',
	'- One short sentence per pane, written in the language the user writes in.',
	'- Plan tense ("Will post a summary to Slack", "Runs daily at 8:00").',
	'- Use "" for a pane the conversation has not determined yet. Never invent details.',
	// Plan-mode only: prevents rephrasing churn across conversation turns.
	// Workflow mode deliberately re-derives from structure instead (see below).
	"- Stability: given <previous-overview>, keep each pane's wording UNCHANGED unless newer evidence contradicts or fills it.",
	...SHARED_RULES,
	'- skip=true when the conversation is not about building/editing one workflow, when it coordinates multiple workflows, or when no pane would change. With skip=true set every pane to "".',
].join('\n');

interface WorkflowInstructionOptions {
	hasKnownTriggers: boolean;
	/** How the Results pane is handled: generated, generated-but-grounded, or caller-known. */
	results: 'generate' | 'grounded' | 'known' | 'knownEmpty';
}

/**
 * Workflow-subject instructions, assembled around which panes the model
 * actually produces — caller-known panes (deterministic triggers/results) are
 * authoritative context instead of generation targets.
 */
function buildWorkflowInstructions(opts: WorkflowInstructionOptions): string {
	const resultsKnown = opts.results === 'known' || opts.results === 'knownEmpty';
	const producedPanes = [
		...(opts.hasKnownTriggers ? [] : ['Triggers']),
		'Steps',
		...(resultsKnown ? [] : ['Results']),
	];
	const header =
		producedPanes.length === 3
			? 'You produce a compact three-pane "Workflow overview" (Triggers / Steps / Results) for an EXISTING saved n8n workflow.'
			: `You produce the ${producedPanes.join(' and ')} pane${producedPanes.length > 1 ? 's' : ''} of a compact three-pane "Workflow overview" (Triggers / Steps / Results) for an EXISTING saved n8n workflow.`;

	const context: string[] = [];
	if (opts.hasKnownTriggers) {
		context.push(
			'The Triggers pane was derived directly from the workflow structure and is provided in <known-triggers>. Do not produce or restate it — treat it as authoritative context so the panes you produce stay consistent with it.',
		);
	}
	if (opts.results === 'known') {
		context.push(
			'The Results pane was derived directly from the workflow structure and is provided in <known-results>. Do not produce or restate it — treat it as authoritative context so the panes you produce stay consistent with it.',
		);
	} else if (opts.results === 'knownEmpty') {
		context.push(
			'The workflow structure shows no user-visible outputs, so the Results pane is fixed empty — do not describe outcomes in the panes you produce.',
		);
	} else if (opts.results === 'grounded') {
		context.push(
			"Part of the workflow's outputs were derived directly from its structure and are provided in <known-result-facts>. They are authoritative for the results pane: rephrase them freely, never contradict or drop them, and only add outcomes the rest of the structure supports.",
		);
	}

	const tenseExamples = opts.hasKnownTriggers
		? '("Posts a summary to Slack")'
		: '("Runs every Monday at 9:00", "Posts a summary to Slack")';

	return [
		header,
		...context,
		"The <built-workflow> section contains the workflow's actual structure — it is the SOLE source of truth; any conversation context is secondary.",
		'',
		'Rules:',
		'- Re-derive every pane you produce from the current structure on every call. A <previous-overview>, when present, is only a phrasing and language reference — never keep a pane the structure no longer supports: added or removed triggers, changed schedules, changed behavior, and changed destinations must always be reflected.',
		...(opts.hasKnownTriggers
			? []
			: [
					'- triggers: account for ALL trigger nodes present (e.g. "Runs every day at 9:00, or manually on demand").',
				]),
		"- One short sentence per pane, in the same language as the workflow's node names and text where evident, otherwise English.",
		`- Present tense, describing what the workflow does ${tenseExamples}.`,
		'- Use "" for a pane the workflow structure genuinely does not determine. Never invent details.',
		STEPS_RULE,
		...(resultsKnown ? [] : [RESULTS_RULE]),
		OUTPUT_ONLY_RULE,
		'- skip=true only when <built-workflow> is missing or too incomplete to describe. With skip=true set every pane to "".',
	].join('\n');
}

const MAX_CONVERSATION_MESSAGES = 12;
const MAX_MESSAGE_CHARS = 600;
const MAX_SECTION_CHARS = 4000;

function clip(text: string, max: number): string {
	const trimmed = text.trim();
	return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max)}…`;
}

function renderBundle(bundle: WorkflowOverviewBundle): string {
	const sections: string[] = [];

	if (bundle.conversation.length > 0) {
		const conversation = bundle.conversation
			.slice(-MAX_CONVERSATION_MESSAGES)
			.map((m) => `${m.role}: ${clip(m.text, MAX_MESSAGE_CHARS)}`)
			.join('\n');
		sections.push(`<conversation>\n${clip(conversation, MAX_SECTION_CHARS)}\n</conversation>`);
	}

	if (bundle.latestUserMessage) {
		sections.push(
			`<latest-user-message>\n${clip(bundle.latestUserMessage, MAX_MESSAGE_CHARS)}\n</latest-user-message>`,
		);
	}

	if (bundle.qaAnswers && bundle.qaAnswers.length > 0) {
		const qa = bundle.qaAnswers
			.map((a) => `Q: ${clip(a.question, 200)}\nA: ${clip(a.answer, 200)}`)
			.join('\n');
		sections.push(`<qa-answers>\n${clip(qa, MAX_SECTION_CHARS)}\n</qa-answers>`);
	}

	if (bundle.planTaskSpec) {
		sections.push(
			`<plan-task-spec>\n${clip(bundle.planTaskSpec, MAX_SECTION_CHARS)}\n</plan-task-spec>`,
		);
	}

	if (bundle.knownTriggers) {
		sections.push(
			`<known-triggers>\n${clip(bundle.knownTriggers, MAX_SECTION_CHARS)}\n</known-triggers>`,
		);
	}

	if (bundle.knownResults) {
		sections.push(
			`<known-results>\n${clip(bundle.knownResults, MAX_SECTION_CHARS)}\n</known-results>`,
		);
	}

	// Grounding fragments only make sense while the pane is still generated.
	if (bundle.knownResults === undefined && bundle.resultFactsContext) {
		sections.push(
			`<known-result-facts>\n${clip(bundle.resultFactsContext, MAX_SECTION_CHARS)}\n</known-result-facts>`,
		);
	}

	if (bundle.builtWorkflowSummary) {
		sections.push(
			`<built-workflow>\n${clip(bundle.builtWorkflowSummary, MAX_SECTION_CHARS)}\n</built-workflow>`,
		);
	}

	sections.push(
		`<previous-overview>\n${
			bundle.previousOverview ? JSON.stringify(bundle.previousOverview) : 'none'
		}\n</previous-overview>`,
	);

	sections.push('Produce the updated overview JSON now.');
	return sections.join('\n\n');
}

export interface GenerateWorkflowOverviewOptions {
	/** Invoked when generation yields no overview — reason + optional detail for diagnostics. */
	onFailure?: (
		reason: 'generation_error' | 'invalid_output' | 'model_skipped' | 'empty_output',
		detail?: string,
	) => void;
	/** Token usage of the LLM call — fires on success AND on skip/invalid outputs (tokens were spent either way). */
	onUsage?: (usage: WorkflowOverviewUsage) => void;
	/** LangSmith telemetry for the underlying SDK call, same contract as agents runtime calls. */
	telemetry?: BuiltTelemetry | Telemetry;
}

async function resolveBuiltTelemetry(
	telemetry: BuiltTelemetry | Telemetry | undefined,
): Promise<BuiltTelemetry | undefined> {
	if (!telemetry) return undefined;
	return 'build' in telemetry ? await telemetry.build() : telemetry;
}

/**
 * Map BuiltTelemetry to the AI SDK's `telemetry` option. Mirrors the
 * runtime-internal `buildAiSdkTelemetry` in @n8n/agents — `runtime/` is
 * deliberately not exported from that package, so the small mapping is
 * duplicated here instead of widening its public surface.
 */
function toSdkTelemetry(telemetry: BuiltTelemetry | undefined) {
	if (!telemetry?.enabled) return {};
	const integrations =
		telemetry.resolveIntegrations?.(telemetry.metadata) ?? telemetry.integrations;
	return {
		telemetry: {
			isEnabled: true,
			functionId: telemetry.functionId ?? 'instance-ai.workflow-overview',
			recordInputs: telemetry.recordInputs,
			recordOutputs: telemetry.recordOutputs,
			integrations: integrations.length > 0 ? integrations : undefined,
		},
	};
}

/**
 * Generate the three-pane overview from the bundle. Returns null when the
 * model signals skip, produces an all-empty overview, or the call fails —
 * the failure reason is reported through `options.onFailure`.
 */
export async function generateWorkflowOverview(
	modelId: ModelConfig,
	bundle: WorkflowOverviewBundle,
	options?: GenerateWorkflowOverviewOptions,
): Promise<WorkflowOverview | null> {
	try {
		const { generateObject } = await import('ai');
		const model = createModel(modelId);
		const telemetry = await resolveBuiltTelemetry(options?.telemetry);

		// Caller-supplied panes skip generating those fields entirely: smaller
		// output schema, and the values are prompt context instead. knownResults
		// distinguishes '' (known-empty pane) from undefined (generate it).
		const knownTriggers =
			bundle.subject === 'workflow' && bundle.knownTriggers?.trim()
				? bundle.knownTriggers.trim()
				: undefined;
		const knownResults =
			bundle.subject === 'workflow' && bundle.knownResults !== undefined
				? bundle.knownResults.trim()
				: undefined;
		const hasKnownResults = knownResults !== undefined;
		const grounded = !hasKnownResults && Boolean(bundle.resultFactsContext?.trim());
		type GenerationOutput = { skip: boolean; triggers?: string; steps: string; results?: string };
		const activeSchema: z.ZodType<GenerationOutput> =
			knownTriggers && hasKnownResults
				? generationSchemaStepsOnly
				: knownTriggers
					? generationSchemaWithoutTriggers
					: hasKnownResults
						? generationSchemaWithoutResults
						: generationSchema;
		const instructions =
			bundle.subject === 'workflow'
				? buildWorkflowInstructions({
						hasKnownTriggers: knownTriggers !== undefined,
						results: hasKnownResults
							? knownResults
								? 'known'
								: 'knownEmpty'
							: grounded
								? 'grounded'
								: 'generate',
					})
				: PLAN_INSTRUCTIONS;

		const result = await generateObject({
			model,
			schema: activeSchema,
			instructions,
			messages: [{ role: 'user', content: renderBundle(bundle) }],
			...toSdkTelemetry(telemetry),
		});
		options?.onUsage?.({
			inputTokens: result.usage.inputTokens,
			outputTokens: result.usage.outputTokens,
			totalTokens: result.usage.totalTokens,
		});

		const parsed = activeSchema.safeParse(result.object);
		if (!parsed.success) {
			options?.onFailure?.('invalid_output', parsed.error.message);
			return null;
		}
		if (parsed.data.skip) {
			options?.onFailure?.('model_skipped');
			return null;
		}

		const overview: WorkflowOverview = {
			triggers: knownTriggers ?? parsed.data.triggers?.trim() ?? '',
			steps: parsed.data.steps.trim(),
			results: knownResults ?? parsed.data.results?.trim() ?? '',
		};
		// Emptiness is judged over the panes the model actually produced —
		// caller-known panes don't count as generated output.
		const generatedPanes = [
			...(knownTriggers ? [] : [overview.triggers]),
			overview.steps,
			...(hasKnownResults ? [] : [overview.results]),
		];
		const emptyOutput = generatedPanes.every((pane) => !pane);
		if (emptyOutput) {
			options?.onFailure?.('empty_output');
			return null;
		}
		return overview;
	} catch (error) {
		options?.onFailure?.(
			'generation_error',
			error instanceof Error ? `${error.name}: ${error.message}` : String(error),
		);
		return null;
	}
}
