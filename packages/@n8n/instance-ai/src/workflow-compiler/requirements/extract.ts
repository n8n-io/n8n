import { tokenize } from '../catalog/retrieval';
import {
	ambiguous,
	missing,
	resolved,
	type Intent,
	type RequestedAction,
	type Requirements,
} from './types';

/**
 * Deterministic requirement extraction. It records what the text states explicitly and leaves
 * everything else `missing` for a decision batch or clarification round; it never guesses.
 */

const INTENT_CUES: Array<[Intent, RegExp]> = [
	['debug', /\b(debug|fix|failing|fails|error|broken|not working|why does|diagnos)/i],
	[
		'edit',
		/\b(edit|modify|change|update|add .* to (the|my) (existing )?workflow|remove .* from (the|my) workflow|rename|existing workflow)/i,
	],
	[
		'create',
		/\b(create|build|make|new workflow|set up|setup|generate|i need a workflow|automation)/i,
	],
];

const INTEGRATIONS: Array<[string, RegExp[]]> = [
	['slack', [/\bslack\b/i, /#[a-z0-9_-]+/]],
	['hubspot', [/\bhubspot\b/i]],
	['postgres', [/\bpostgres(ql)?\b/i, /\bdatabase table\b/i]],
	['http', [/\bhttp request\b/i, /\bcall (the |an )?api\b/i, /\benrich/i, /https?:\/\/\S+/i]],
	['workflow', [/\bsub-?workflow\b/i, /\bexecute workflow\b/i, /\banother workflow\b/i]],
];

const METHOD_PATH = /\b(GET|POST|PUT|PATCH|DELETE)\s+(\/[A-Za-z0-9_\-/{}:.]*)/g;

export interface ExtractionContext {
	/** Text of an existing workflow name, when editing. */
	existingWorkflowName?: string;
}

export function detectIntent(text: string): Intent | undefined {
	return INTENT_CUES.find(([, pattern]) => pattern.test(text))?.[0];
}

export function detectIntegrations(text: string): string[] {
	return INTEGRATIONS.filter(([, patterns]) => patterns.some((pattern) => pattern.test(text))).map(
		([name]) => name,
	);
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** Phrase cue → default hour and day-of-week field, checked in order after the weekday cues. */
const DAY_CUES: Array<[RegExp, number, string]> = [
	[/\b(every\s+)?weekdays?\b|\bmonday (to|through) friday\b/, 9, '1-5'],
	[/\bweekly\b|\bevery week\b/, 9, '1'],
	[/\bevery (night|evening)\b|\bnightly\b|\bmidnight\b/, 2, '*'],
	[/\bevery (morning|day)\b|\bdaily\b|\bonce a day\b|\beach (day|morning)\b/, 9, '*'],
];

/** Deterministic phrase → cron. Returns undefined when the phrase is not precise enough. */
export function detectScheduleCron(text: string): string | undefined {
	const explicit = text.match(/cron\s*[:=]?\s*["'`]?([0-9*,/-]+(?:\s+[0-9*,/-]+){4})/i);
	if (explicit) return explicit[1];
	const lower = text.toLowerCase();
	const time = lower.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
	let hour: number | undefined;
	let minute = 0;
	if (time) {
		hour = Number(time[1]);
		minute = time[2] ? Number(time[2]) : 0;
		if (time[3] === 'pm' && hour < 12) hour += 12;
		if (time[3] === 'am' && hour === 12) hour = 0;
		// A clock time outside the day is not a schedule; fall back to the phrase defaults.
		if (hour > 23 || minute > 59) [hour, minute] = [undefined, 0];
	}
	const minutes = lower.match(/\bevery\s+(\d+)\s+minutes?\b/);
	if (minutes && Number(minutes[1]) > 0) return `*/${minutes[1]} * * * *`;
	if (/\bevery hour\b|\bhourly\b/.test(lower)) return '0 * * * *';
	const weekday = WEEKDAYS.findIndex((day) =>
		new RegExp(`\\b(every|each|on)\\s+${day}s?\\b`).test(lower),
	);
	if (weekday >= 0) return `${minute} ${hour ?? 9} * * ${weekday}`;
	const cue = DAY_CUES.find(([pattern]) => pattern.test(lower));
	if (cue) return `${minute} ${hour ?? cue[1]} * * ${cue[2]}`;
	return hour === undefined ? undefined : `${minute} ${hour} * * *`;
}

const ACTION_VERBS =
	/\b(send|post|notify|message|alert|upsert|create|update|insert|store|save|persist|log|record|enrich|validate|check|call|fetch|look ?up|respond|return|reply|add|sync|find|read|query|route|delete|archive|run)(s|es|ed|ing)?\b/i;

const CONDITION_LEAD = /^(if|when|whenever|unless|only if|only when)\b/i;

/** "Create an API workflow" states the intent, not a step of the workflow. */
const INTENT_STATEMENT =
	/\b(create|build|make|set ?up|generate|need|want)\b.*\b(workflow|automation)\b/i;

/** "when a POST /leads arrives", "every night": these describe the start, not an action. */
const TRIGGER_PHRASE =
	/^(when|whenever|on|every|each time|nightly|daily|hourly)\b|\b(GET|POST|PUT|PATCH|DELETE)\s+\//i;

/** Splits the request into candidate action phrases (sentences and clauses). */
export function splitActionPhrases(text: string): string[] {
	const raw = text
		.split(/(?<=[.;!?])\s+|\n+|,\s+(?:and\s+)?(?:then\s+)?|\s+(?:and then|then|also)\s+/i)
		.map((phrase) => phrase.trim().replace(/^(and|then|also|please)\s+/i, ''))
		.filter((phrase) => phrase.length > 3);
	// Keep "If they are new, send a message" as one phrase so the condition stays with its action.
	const merged: string[] = [];
	for (const phrase of raw) {
		const previous = merged[merged.length - 1];
		if (previous && CONDITION_LEAD.test(previous) && !ACTION_VERBS.test(previous)) {
			merged[merged.length - 1] = `${previous}, ${phrase}`;
		} else merged.push(phrase);
	}
	return merged;
}

export function extractRequirements(
	request: string,
	context: ExtractionContext = {},
): Requirements {
	const intent = detectIntent(request);
	const methods = [...request.matchAll(METHOD_PATH)];
	const cron = detectScheduleCron(request);
	const integrations = detectIntegrations(request);

	let trigger: Requirements['trigger'];
	const triggerParams: Requirements['triggerParams'] = {};
	if (methods.length > 0) {
		const param = (values: string[], question: string) =>
			values.length === 1 ? resolved(values[0], 'user') : ambiguous(values, question);
		trigger = resolved('webhook', 'user');
		const methodValues = methods.map((m) => m[1].toUpperCase());
		triggerParams.method = param(
			methodValues,
			'Which HTTP method should the main endpoint accept?',
		);
		const pathValues = methods.map((m) => m[2]);
		triggerParams.path = param(pathValues, 'Which endpoint should this workflow expose?');
	} else if (/\b(webhook|endpoint|api)\b/i.test(request)) {
		trigger = resolved('webhook', 'user');
		triggerParams.method = missing('Which HTTP method should the endpoint accept?');
		triggerParams.path = missing('What path should the endpoint use?');
	} else if (cron) {
		trigger = resolved('schedule', 'user');
		triggerParams.cron = resolved(cron, 'user');
	} else if (/\b(schedule|periodic|recurring)\b/i.test(request)) {
		trigger = resolved('schedule', 'user');
		triggerParams.cron = missing('How often should the workflow run?');
	} else if (/\b(manual|one-off|once|by hand)\b/i.test(request)) {
		trigger = resolved('manual', 'user');
	} else {
		trigger = missing(
			'What should start this workflow: an HTTP endpoint, a schedule, or a manual run?',
		);
	}

	const actions: RequestedAction[] = [];
	const requiredFields = new Set<string>();
	const emailFields = new Set<string>();
	const responseFields: string[] = [];
	let respond: Requirements['respond'];

	splitActionPhrases(request).forEach((phrase, index) => {
		const validate = phrase.match(
			/\bvalidate\s+(?:the\s+)?([a-z_][a-z_ ,]*?)(?=\s+(?:fields?|before|then)\b|[.;]|$)/i,
		);
		if (validate) {
			for (const raw of validate[1].split(/\s*(?:,|and)\s*/)) {
				const fieldName = raw.trim().replace(/\s+/g, '_');
				if (fieldName) (/email/i.test(fieldName) ? emailFields : requiredFields).add(fieldName);
			}
			return;
		}
		const respondMatch = phrase.match(/\b(?:respond|reply|return)\s+(?:with\s+)?(?:the\s+)?(.+)/i);
		if (respondMatch && /\b(respond|reply|return)\b/i.test(phrase)) {
			respond = resolved(true, 'user');
			const described = respondMatch[1].replace(/[.]$/, '');
			if (described) responseFields.push(described);
			return;
		}
		if (
			!ACTION_VERBS.test(phrase) ||
			INTENT_STATEMENT.test(phrase) ||
			TRIGGER_PHRASE.test(phrase)
		) {
			return;
		}
		const integration = detectIntegrations(phrase)[0];
		const params: Record<string, unknown> = {};
		const channel = phrase.match(/#[a-z0-9_-]+/i)?.[0];
		if (channel) params.channel = channel;
		const table = phrase.match(/\b(?:table|into)\s+["'`]?([a-z_][a-z0-9_]*)["'`]?/i)?.[1];
		if (table && integration === 'postgres') params.table = table;
		const url = phrase.match(/https?:\/\/\S+/i)?.[0];
		if (url) params.url = url.replace(/[.,)]$/, '');
		const conditional = phrase.match(
			/^(?:only\s+)?(?:if|when|whenever|unless)\s+(.+?)(?:,|$)/i,
		)?.[1];
		actions.push({
			id: `${tokenize(phrase).slice(0, 3).join('-') || 'action'}-${index + 1}`,
			text: phrase,
			...(integration ? { integration } : {}),
			params,
			...(conditional ? { conditional } : {}),
		});
	});

	const nameMatch = request.match(/\b(?:called|named)\s+["“]([^"”]+)["”]/i);
	const workflowName = nameMatch
		? resolved(nameMatch[1], 'user')
		: context.existingWorkflowName
			? resolved(context.existingWorkflowName, 'workflow')
			: resolved(deriveWorkflowName(request, methods[0]?.[2], integrations), 'default');

	const errorPolicy = /\bretry\b/i.test(request)
		? resolved('retry', 'user')
		: /\bdead[- ]?letter\b/i.test(request)
			? resolved('dead_letter', 'user')
			: resolved('fail_workflow', 'policy');

	return {
		intent: intent
			? resolved(intent, 'user')
			: missing(
					'Do you want to create a new workflow, edit an existing one, or debug a failing one?',
				),
		trigger,
		triggerParams,
		actions,
		...(respond ? { respond } : {}),
		responseFields,
		requiredFields: [...requiredFields],
		emailFields: [...emailFields],
		workflowName,
		errorPolicy,
		answers: {},
	};
}

function deriveWorkflowName(
	request: string,
	path: string | undefined,
	integrations: string[],
): string {
	const segment = path?.split('/').filter(Boolean)[0];
	if (segment) return `${capitalize(segment)} API`;
	if (integrations.length > 0) return `${integrations.map(capitalize).join(' + ')} automation`;
	const words = tokenize(request).slice(0, 4).map(capitalize);
	return words.length > 0 ? words.join(' ') : 'New workflow';
}

function capitalize(value: string): string {
	return value.charAt(0).toUpperCase() + value.slice(1);
}
