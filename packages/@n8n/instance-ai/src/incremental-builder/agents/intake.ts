/**
 * Intake — clarifying-question agent.
 *
 * Goal: turn the user's raw initial request into a `ScopeSpec` before any
 * building starts. Asks up to N rounds of open-ended, user-message-specific
 * questions via the HitlBroker, then emits the scope.
 *
 * On round 0 we hard-require a question — if the model returns enoughInfo
 * we retry with a sharpened prompt. There are no hardcoded fallback
 * questions; if the LLM truly fails twice we bail to `deriveFallbackScope`
 * rather than ask a canned, off-topic question.
 */

import { Agent } from '@n8n/agents';
import type { IncScopeSpec } from '@n8n/api-types';
import { z } from 'zod';

import type { EventChannel } from '../event-helpers';
import { publishPhase, publishScope, publishStatus } from '../event-helpers';
import type { HitlBroker, HitlChoiceOption } from '../hitl-broker';
import { classifyFreeTextChoice } from '../intent-classifier';

const intakeStepSchema = z.object({
	enoughInfo: z.boolean().describe('True when we have enough to draft a scope'),
	scope: z
		.object({
			trigger: z.string(),
			primaryAction: z.string(),
			destination: z.string().optional(),
			constraints: z.array(z.string()).default([]),
			assumptions: z.array(z.string()).default([]),
			intentBrief: z.string(),
		})
		.optional()
		.describe('Filled when enoughInfo is true'),
	nextQuestion: z
		.object({
			question: z.string(),
			options: z.array(z.string()).min(2).max(4),
			allowFreeText: z.boolean().default(true),
			intro: z.string().optional(),
		})
		.optional()
		.describe('Filled when enoughInfo is false'),
});

type IntakeStep = z.infer<typeof intakeStepSchema>;

const SYSTEM_PROMPT = `You are the intake step for an n8n workflow builder.
Your single job is to ask clarifying questions BEFORE any workflow is built.
A vague brief leads to wasted work — keep the user involved.

Your output is structured JSON. Every turn, decide one of:

1. "enoughInfo: false" — ask ONE clarifying question that is SPECIFIC to
   what the user actually said. Read their message and pick the biggest
   ambiguity in their request. Offer 2-4 concrete options grounded in their
   wording. Set allowFreeText: true so the user can type their own answer.
   Prefer options that name SPECIFIC tools / nodes / services
   ("Gmail", "Outlook", "SendGrid") rather than abstractions.

2. "enoughInfo: true" — you have enough to write a 1-paragraph intent brief.
   Fill the scope object. The intentBrief is what the final Verifier will
   use to check the built workflow — write it crisply.

How to pick the FIRST question:
- Read the user's message carefully. Identify what is concrete vs ambiguous.
- The question must be tailored to that message. Generic questions like
  "what integration do you want?" are forbidden when the user already
  mentioned a service or domain.
- Examples:
    User says "summarize my emails daily"
      → Ask which email account (Gmail, Outlook, IMAP), since "emails" is
        ambiguous.
    User says "post Slack message when GitHub PR is opened"
      → Ask which Slack channel / DM target, since trigger is already clear.
    User says "scrape my competitors' pricing"
      → Ask where the URL list lives (manual list, a Google Sheet, a
        database), since the input source is unclear.
    User says "send me a daily summary"
      → Ask where the source data is — that's the biggest gap.

Strict rules:
- ALWAYS ask at least ONE clarifying question on the FIRST turn, no matter
  how detailed the brief seems. The user expects to be consulted.
- The question text and options MUST reference details from the user's
  message — never reuse a generic template question.
- Questions MUST be open-ended ("Which …", "Where …", "What …",
  "How often …"). NEVER yes/no, NEVER "Is/Did/Should …". If the user
  trains themselves to click "yes" they stop reading. We always want them
  comparing real alternatives.
- Every option must be a concrete answer to the open-ended question — not
  a "yes" / "no" reframing.
- Continue asking until at least these are pinned down explicitly:
    • Trigger source (exact service + event)
    • Which integration / tool to use for each external action
    • Destination of the result (where data goes / what gets created)
    • Any filter / schedule / criteria constraints
- A user message that names ONE of those is not "detailed" — keep asking.
- Stop after at most 3 rounds, fill remaining gaps as documented assumptions.
- NEVER ask about UI / naming / styling.`;

export interface IntakeOptions {
	model: string;
	fastModel?: string;
	userMessage: string;
	broker: HitlBroker;
	channel: EventChannel;
	maxRounds?: number;
}

export async function runIntake(opts: IntakeOptions): Promise<IncScopeSpec> {
	publishPhase(opts.channel, 'intake', 'Clarifying scope');

	const maxRounds = opts.maxRounds ?? 3;
	const transcript: string[] = [`User: ${opts.userMessage}`];

	const agent = new Agent('inc-intake')
		.model(opts.model)
		.instructions(SYSTEM_PROMPT)
		.structuredOutput(intakeStepSchema);

	for (let round = 0; round < maxRounds; round++) {
		publishStatus(opts.channel, `Intake round ${round + 1}`);
		const enforceQuestion = round === 0;

		const parsed = await produceIntakeStep(agent, transcript, enforceQuestion, opts.userMessage);

		if (!parsed) {
			// LLM failed to produce structured output after retries — bail out of
			// intake entirely. The orchestrator will derive a fallback scope from
			// what we have. Better than asking a canned, off-topic question.
			break;
		}

		if (parsed.enoughInfo && parsed.scope) {
			const scope = normalizeScope(parsed.scope);
			publishScope(opts.channel, scope, 'confirmed');
			return scope;
		}

		if (!parsed.nextQuestion) {
			// No question and no scope — nothing useful to do this round.
			break;
		}

		const cancelled = await askAndAppend(opts, parsed.nextQuestion, transcript);
		if (cancelled) break;
	}

	// Fall-through: derive a minimal scope from what we have so the builder
	// can still proceed (with assumptions noted).
	const scope = await deriveFallbackScope(opts.model, transcript);
	publishScope(opts.channel, scope, 'confirmed');
	return scope;
}

type NextQuestion = NonNullable<IntakeStep['nextQuestion']>;

/**
 * Call the intake agent. When `forceQuestion` is true, retry once with a
 * sharpened prompt if the first response didn't include a question — the
 * model occasionally ignores the "ask first" rule, and we'd rather pay one
 * extra LLM call than skip clarification.
 */
async function produceIntakeStep(
	agent: Agent,
	transcript: string[],
	forceQuestion: boolean,
	userMessage: string,
): Promise<IntakeStep | undefined> {
	const basePrompt =
		`Conversation so far:\n${transcript.join('\n')}\n\n` +
		(forceQuestion
			? `This is the FIRST turn. The user's original request was:\n"""\n${userMessage}\n"""\n\n` +
				'You MUST ask a clarifying question that is SPECIFIC to the request ' +
				'above — set enoughInfo: false AND fill nextQuestion. The question ' +
				"and its options MUST reference details from the user's message. " +
				'Do NOT return a scope yet. Do NOT use a generic template question.\n\n'
			: '') +
		'Decide the next intake step. Output the JSON object only.';

	const first = await agent.generate(basePrompt);
	const firstParsed = (first as { structuredOutput?: IntakeStep }).structuredOutput;

	if (!forceQuestion) return firstParsed;
	if (firstParsed?.nextQuestion && !firstParsed.enoughInfo) return firstParsed;

	// Retry with the sharpest possible instruction.
	const retry = await agent.generate(
		basePrompt +
			'\n\nYour previous response did not include nextQuestion. You MUST output ' +
			'a JSON object with enoughInfo: false and a fully-specified nextQuestion ' +
			`(question that directly references "${userMessage.slice(0, 200)}", ` +
			'options: [2-4 strings grounded in that request], allowFreeText: true). ' +
			'DO NOT return a scope. Output the JSON object only.',
	);
	const retryParsed = (retry as { structuredOutput?: IntakeStep }).structuredOutput;
	if (retryParsed?.nextQuestion) {
		return { enoughInfo: false, nextQuestion: retryParsed.nextQuestion };
	}
	return undefined;
}

/**
 * Show a question to the user, classify their reply, and append both
 * turns to the transcript. Returns true when the user cancelled.
 */
async function askAndAppend(
	opts: IntakeOptions,
	question: NextQuestion,
	transcript: string[],
): Promise<boolean> {
	const options: HitlChoiceOption[] = question.options.map((label, i) => ({
		id: `opt_${i}`,
		label,
	}));

	const response = await opts.broker.requestChoice({
		question: question.question,
		...(question.intro !== undefined && { intro: question.intro }),
		options,
		allowFreeText: question.allowFreeText ?? true,
	});

	if (response.cancelled) return true;

	let userTurn = '';
	if (response.choiceId) {
		const picked = options.find((o) => o.id === response.choiceId);
		userTurn = picked ? `User picked: ${picked.label}` : `User picked option ${response.choiceId}`;
	} else if (response.freeText) {
		const classifier = await classifyFreeTextChoice({
			model: opts.fastModel ?? opts.model,
			question: question.question,
			options,
			freeText: response.freeText,
		});
		if (classifier.match === 'option' && classifier.chosenOptionId) {
			const picked = options.find((o) => o.id === classifier.chosenOptionId);
			userTurn = picked
				? `User typed "${response.freeText}" — interpreted as: ${picked.label}`
				: `User picked option ${classifier.chosenOptionId}`;
		} else if (classifier.match === 'new-intent' && classifier.newIntentSummary) {
			userTurn = `User free-text (new direction): ${response.freeText} (summary: ${classifier.newIntentSummary})`;
		} else {
			userTurn = `User free-text: ${response.freeText}`;
		}
	} else {
		userTurn = 'User gave no answer';
	}

	transcript.push(`Assistant asked: ${question.question}`);
	transcript.push(userTurn);
	return false;
}

function normalizeScope(s: NonNullable<IntakeStep['scope']>): IncScopeSpec {
	return {
		trigger: s.trigger,
		primaryAction: s.primaryAction,
		...(s.destination !== undefined && { destination: s.destination }),
		constraints: s.constraints ?? [],
		assumptions: s.assumptions ?? [],
		intentBrief: s.intentBrief,
	};
}

async function deriveFallbackScope(model: string, transcript: string[]): Promise<IncScopeSpec> {
	const agent = new Agent('inc-intake-fallback')
		.model(model)
		.instructions(
			'Compress the partial conversation into a minimal ScopeSpec. ' +
				'Fill missing fields with sensible defaults and add them to `assumptions`.',
		)
		.structuredOutput(
			z.object({
				trigger: z.string(),
				primaryAction: z.string(),
				destination: z.string().optional(),
				constraints: z.array(z.string()).default([]),
				assumptions: z.array(z.string()).default([]),
				intentBrief: z.string(),
			}),
		);

	const result = await agent.generate(transcript.join('\n'));
	const out = (result as { structuredOutput?: NonNullable<IntakeStep['scope']> }).structuredOutput;
	if (!out) {
		return {
			trigger: 'manual',
			primaryAction: transcript.join(' ').slice(0, 120),
			constraints: [],
			assumptions: ['Intake fell through; using raw user message as primary action'],
			intentBrief: transcript.join(' ').slice(0, 240),
		};
	}
	return normalizeScope(out);
}
