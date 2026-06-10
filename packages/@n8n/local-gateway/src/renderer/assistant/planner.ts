/*
 * Stub planner for the desktop-assistant composer.
 *
 * TODO(desktop-assistant): replace `planTask` with a real backend/IPC call
 * (the prototype POSTs to `/api/plan`). For now this resolves locally after a
 * short delay with a heuristic mock plan so the demo exercises every branch of
 * the post-submit flow (one-off / recurring / trigger / connection / complex).
 *
 * The mock plans imitate the prototype seed tasks' shape: a natural-language
 * sentence built from short string segments, with 1–4 word inline chips (each
 * offering a couple of plausible alternatives) carrying the editable bits. The
 * user's own prompt is woven into the surrounding strings, never dumped into a
 * single oversized chip.
 */
import type { AssistantContextKind } from './contexts';

/** A natural-language sentence segment. Object parts render as inline chip pickers. */
export type PlanPart = string | { value: string; options?: string[] };

export interface Plan {
	title: string;
	/** Emoji glyph, defaults to ✨. */
	icon: string;
	/** Sentence segments — strings render verbatim, objects render as pickers. */
	parts: PlanPart[];
	/** `parts` joined into a single string. */
	summary: string;
	assumptions: string[];
	recurring: boolean;
	schedule?: string;
	trigger?: string;
	/** Service names the task needs connected, e.g. `['Gmail']`. */
	requiredConnections: string[];
	timeSavedMin?: number;
	location: 'cloud' | 'local';
	/** When true the build is routed to the full canvas ("bigger build"). */
	complex: boolean;
}

const CONNECTION_KEYWORDS: Array<{ match: string[]; service: string }> = [
	{ match: ['gmail', 'email', 'e-mail'], service: 'Gmail' },
	{ match: ['slack'], service: 'Slack' },
];
const COMPLEX_PROMPT_LENGTH = 120;

/**
 * Cadence phrases recognised in a prompt, longest/most-specific first. The
 * matched phrase becomes the schedule chip value so the plan echoes the user's
 * own words; `alts` offers a couple of plausible neighbouring cadences.
 */
const CADENCES: Array<{ match: string; chip: string; alts: string[] }> = [
	{ match: 'every morning', chip: 'morning', alts: ['weekday morning', 'weekday at 9am'] },
	{ match: 'every weekday', chip: 'weekday', alts: ['weekday morning', 'morning'] },
	{ match: 'weekday', chip: 'weekday', alts: ['weekday morning', 'morning'] },
	{ match: 'monday', chip: 'Monday', alts: ['weekday', 'morning'] },
	{ match: 'tuesday', chip: 'Tuesday', alts: ['weekday', 'morning'] },
	{ match: 'wednesday', chip: 'Wednesday', alts: ['weekday', 'morning'] },
	{ match: 'thursday', chip: 'Thursday', alts: ['weekday', 'morning'] },
	{ match: 'friday', chip: 'Friday', alts: ['weekday', 'Monday'] },
	{ match: 'saturday', chip: 'Saturday', alts: ['weekend', 'Sunday'] },
	{ match: 'sunday', chip: 'Sunday', alts: ['weekend', 'Saturday'] },
	{ match: 'weekend', chip: 'weekend', alts: ['Saturday', 'Sunday'] },
	{ match: 'hourly', chip: 'hour', alts: ['weekday', 'morning'] },
	{ match: 'nightly', chip: 'night', alts: ['weekday', 'evening'] },
	{ match: 'daily', chip: 'day', alts: ['weekday', 'morning'] },
	{ match: 'weekly', chip: 'week', alts: ['weekday', 'Monday'] },
	{ match: 'monthly', chip: 'month', alts: ['week', 'weekday'] },
];

/** Any of these words signals a recurring task even without an explicit cadence. */
const RECURRING_WORDS = ['every', 'each', 'recurring', 'schedule', 'regularly'];

/** Joins parts into the human-readable summary sentence. */
function summarise(parts: PlanPart[]): string {
	return parts.map((part) => (typeof part === 'string' ? part : part.value)).join('');
}

/** Filler words trimmed from the front of a prompt when deriving a chip/title. */
const LEADING_FILLERS = new Set([
	'please',
	'can',
	'you',
	'i',
	'want',
	'to',
	'help',
	'me',
	'a',
	'an',
	'the',
]);

function words(prompt: string): string[] {
	return prompt.trim().replace(/\s+/g, ' ').split(' ').filter(Boolean);
}

/** Drops leading filler words so chips/titles start on the meaningful verb/noun. */
function meaningfulWords(prompt: string): string[] {
	const all = words(prompt);
	let start = 0;
	while (
		start < all.length &&
		LEADING_FILLERS.has(all[start].toLowerCase().replace(/[^a-z]/g, ''))
	) {
		start += 1;
	}
	// If everything was filler, fall back to the original words.
	return start < all.length ? all.slice(start) : all;
}

/**
 * Verbs that describe delivering a result to the user ("email me…", "send
 * me…"). When the prompt leads with one, the delivery is carried by the
 * trailing "and [email it to you]" clause instead of the action chip, so the
 * verb (and its "me"/article) is stripped from the chip.
 */
const DELIVERY_VERBS = new Set(['email', 'send', 'mail', 'message', 'post', 'give', 'show']);

interface ActionPhrase {
	/** Short second-person chip value, e.g. "a summary of your week". */
	chip: string;
	/** Same phrase in the user's own first person, used for the title. */
	titleSource: string;
	/** True when a leading delivery verb ("email me…") was stripped. */
	delivery: boolean;
}

/**
 * Extracts the core action from the prompt for use as an inline chip: removes
 * the cadence phrase ("Every Friday, …"), leading fillers and any leading
 * delivery verb, then converts to second person so it reads naturally inside
 * the assistant's "I'll …" sentence.
 */
function actionPhrase(prompt: string, cadenceMatch?: string): ActionPhrase {
	let text = prompt.trim();
	if (cadenceMatch) {
		text = text.replace(new RegExp(`\\b(?:every|each)?\\s*${cadenceMatch}\\b,?`, 'i'), ' ');
	}
	const remaining = meaningfulWords(text.replace(/\s+/g, ' ').trim());

	let delivery = false;
	if (remaining.length > 1 && DELIVERY_VERBS.has(remaining[0].toLowerCase())) {
		delivery = true;
		remaining.shift();
		if (remaining[0]?.toLowerCase() === 'me') remaining.shift();
	}

	const titleSource = remaining.join(' ');
	const chip = remaining
		.slice(0, 6)
		.join(' ')
		.replace(/[.,;:!?]+$/, '')
		.toLowerCase()
		.replace(/\bmy\b/g, 'your')
		.replace(/\bme\b/g, 'you')
		.replace(/\bi\b/g, 'you');
	return { chip, titleSource, delivery };
}

/**
 * Derives a short, card-friendly task name from the prompt: meaningful words,
 * cut at a word boundary near ~40 chars (never mid-word), sentence-cased, no
 * trailing punctuation. The result also becomes the created task's name, so it
 * must read like a task name rather than a truncated sentence.
 */
const MAX_TITLE_LENGTH = 40;
/** Connector words that read awkwardly as the last word of a title. */
const TRAILING_FILLERS = new Set([
	'every',
	'each',
	'and',
	'or',
	'to',
	'the',
	'a',
	'an',
	'by',
	'with',
	'of',
	'in',
	'on',
	'for',
]);
function toTitle(prompt: string): string {
	const source = meaningfulWords(prompt);
	const picked: string[] = [];
	let length = 0;
	for (const word of source) {
		const next = length === 0 ? word.length : length + 1 + word.length;
		if (picked.length > 0 && next > MAX_TITLE_LENGTH) break;
		picked.push(word);
		length = next;
	}
	// Don't leave a title dangling on a connector word (e.g. "…emails every").
	while (picked.length > 1 && TRAILING_FILLERS.has(picked[picked.length - 1].toLowerCase())) {
		picked.pop();
	}
	const title = picked.join(' ').replace(/[.,;:!?]+$/, '');
	return title.charAt(0).toUpperCase() + title.slice(1);
}

function detectConnections(lower: string): string[] {
	return CONNECTION_KEYWORDS.filter(({ match }) => match.some((m) => lower.includes(m))).map(
		({ service }) => service,
	);
}

/** The cadence the prompt names, if any. */
function detectCadence(lower: string): (typeof CADENCES)[number] | undefined {
	return CADENCES.find(({ match }) => lower.includes(match));
}

function isComplex(prompt: string, lower: string): boolean {
	return prompt.length > COMPLEX_PROMPT_LENGTH || lower.includes(' and then ');
}

/**
 * Fallback plan used when planning fails — mirrors the prototype's `sM`.
 * Exported so the composer can build the confirmation screen on error. This is
 * the intentional last resort, so it does embed the raw prompt as the chip.
 */
export function buildFallbackPlan(prompt: string): Plan {
	const parts: PlanPart[] = ["I'll help you: ", { value: prompt }];
	return {
		title: prompt.slice(0, 40),
		icon: '✨',
		parts,
		summary: summarise(parts),
		assumptions: [prompt],
		recurring: false,
		requiredConnections: [],
		location: 'cloud',
		complex: false,
	};
}

/** Builds a heuristic mock plan from the prompt. Pure — no side effects, no delay. */
function buildMockPlan(prompt: string, context: AssistantContextKind): Plan {
	const lower = prompt.toLowerCase();
	const requiredConnections = detectConnections(lower);
	const cadence = detectCadence(lower);
	const recurring = !!cadence || RECURRING_WORDS.some((word) => lower.includes(word));
	const hasTrigger = lower.includes('when');
	const complex = isComplex(prompt, lower);
	const location: Plan['location'] = context === 'finder' ? 'local' : 'cloud';
	const action = actionPhrase(prompt, cadence?.match);
	const title = toTitle(action.titleSource);

	if (complex) {
		const parts: PlanPart[] = [
			"I'll ",
			{ value: action.chip },
			' — connecting a few services and adding some logic along the way.',
		];
		return {
			title,
			icon: '🧩',
			parts,
			summary: summarise(parts),
			assumptions: [prompt],
			recurring,
			schedule: recurring ? scheduleSummary(cadence) : undefined,
			trigger: hasTrigger ? prompt : undefined,
			requiredConnections,
			timeSavedMin: 20,
			location,
			complex: true,
		};
	}

	if (recurring) {
		// Echo the user's cadence word when they named one; otherwise default to weekday.
		const scheduleChip = cadence?.chip ?? 'weekday';
		const scheduleAlts = cadence?.alts ?? ['weekday morning', 'morning'];
		// "email me a summary…" reads as I'll put together [a summary…] and [email it to you];
		// verb-led prompts ("tidy up my desktop") keep their own verb in the chip.
		const parts: PlanPart[] = action.delivery
			? [
					'Every ',
					{ value: scheduleChip, options: [scheduleChip, ...scheduleAlts] },
					", I'll put together ",
					{ value: action.chip, options: actionAlts(action.chip) },
					' and ',
					{
						value: 'email it to you',
						options: ['email it to you', 'save it for you', 'post it to Slack'],
					},
					'.',
				]
			: [
					'Every ',
					{ value: scheduleChip, options: [scheduleChip, ...scheduleAlts] },
					", I'll ",
					{ value: action.chip, options: actionAlts(action.chip) },
					'.',
				];
		return {
			title,
			icon: '🔁',
			parts,
			summary: summarise(parts),
			assumptions: ['Runs on a recurring schedule'],
			recurring: true,
			schedule: scheduleSummary(cadence),
			requiredConnections,
			timeSavedMin: 15,
			location,
			complex: false,
		};
	}

	if (hasTrigger) {
		const parts: PlanPart[] = [
			'When ',
			{
				value: 'something changes',
				options: ['something changes', 'a new file arrives', 'I get a new email'],
			},
			", I'll ",
			{ value: action.chip, options: actionAlts(action.chip) },
			'.',
		];
		return {
			title,
			icon: '🔔',
			parts,
			summary: summarise(parts),
			assumptions: ['Runs automatically when triggered'],
			recurring: false,
			trigger: 'On change',
			requiredConnections,
			timeSavedMin: 10,
			location,
			complex: false,
		};
	}

	// One-off plan: not recurring, no trigger, no connections needed.
	const parts: PlanPart[] = action.delivery
		? ["I'll get you ", { value: action.chip, options: actionAlts(action.chip) }, ' right now.']
		: ["I'll ", { value: action.chip, options: actionAlts(action.chip) }, ' right now.'];
	return {
		title,
		icon: '✨',
		parts,
		summary: summarise(parts),
		assumptions: [prompt],
		recurring: false,
		requiredConnections,
		timeSavedMin: 8,
		location,
		complex: false,
	};
}

/** A human-readable schedule line from the detected cadence (or a sensible default). */
function scheduleSummary(cadence: (typeof CADENCES)[number] | undefined): string {
	if (!cadence) return 'Every weekday at 8am';
	// Capitalise the chip phrase for the summary line, e.g. "weekday" → "Every weekday at 8am".
	return `Every ${cadence.chip}`;
}

/** Two generic alternatives for the action chip so the picker has choices. */
function actionAlts(action: string): string[] {
	return [action, 'summarise it for me', 'send me the highlights'];
}

/** Simulated planner latency — ~900ms feels right for the demo. */
const PLAN_DELAY_MS = 900;

/**
 * TODO(desktop-assistant): swap for a backend/IPC planner call.
 * Resolves a mock plan after a short delay.
 */
export async function planTask(prompt: string, context: AssistantContextKind): Promise<Plan> {
	const plan = buildMockPlan(prompt, context);
	return await new Promise((resolve) => {
		window.setTimeout(() => resolve(plan), PLAN_DELAY_MS);
	});
}
