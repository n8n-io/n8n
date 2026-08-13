/**
 * Sidecar generator for the three-pane workflow overview (Triggers / Steps /
 * Results) rendered next to the AI Assistant chat. Runs outside the agent
 * loop as a small one-shot structured LLM call (mirrors memory/title-utils).
 * Fails soft — any error returns null and the panel simply doesn't refresh.
 */
import { createModel } from '@n8n/agents';
import type { WorkflowOverview } from '@n8n/api-types';
import { z } from 'zod';

import type { ModelConfig } from '../types';

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

const SHARED_RULES = [
	'- steps: exactly one plain sentence; never mention n8n node names or technical jargon.',
	'- results: concrete user-visible outcomes, never vague ("a notification" is too vague; "a Slack message in #support with the ticket summary" is right).',
	"- Stability: given <previous-overview>, keep each pane's wording UNCHANGED unless newer evidence contradicts or fills it.",
	'- Never answer the user or produce anything except the JSON object.',
];

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
	...SHARED_RULES,
	'- skip=true when the conversation is not about building/editing one workflow, when it coordinates multiple workflows, or when no pane would change. With skip=true set every pane to "".',
].join('\n');

const WORKFLOW_INSTRUCTIONS = [
	'You produce a compact three-pane "Workflow overview" (Triggers / Steps / Results) for an EXISTING saved n8n workflow.',
	"The <built-workflow> section contains the workflow's actual structure — it is the source of truth; any conversation context is secondary.",
	'',
	'Rules:',
	"- One short sentence per pane, in the same language as the workflow's node names and text where evident, otherwise English.",
	'- Present tense, describing what the workflow does ("Runs every Monday at 9:00", "Posts a summary to Slack").',
	'- Use "" for a pane the workflow structure genuinely does not determine. Never invent details.',
	...SHARED_RULES,
	'- skip=true only when <built-workflow> is missing or too incomplete to describe. With skip=true set every pane to "".',
].join('\n');

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
		const result = await generateObject({
			model,
			schema: generationSchema,
			instructions: bundle.subject === 'workflow' ? WORKFLOW_INSTRUCTIONS : PLAN_INSTRUCTIONS,
			messages: [{ role: 'user', content: renderBundle(bundle) }],
		});

		const parsed = generationSchema.safeParse(result.object);
		if (!parsed.success) {
			options?.onFailure?.('invalid_output', parsed.error.message);
			return null;
		}
		if (parsed.data.skip) {
			options?.onFailure?.('model_skipped');
			return null;
		}

		const overview: WorkflowOverview = {
			triggers: parsed.data.triggers.trim(),
			steps: parsed.data.steps.trim(),
			results: parsed.data.results.trim(),
		};
		if (!overview.triggers && !overview.steps && !overview.results) {
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
