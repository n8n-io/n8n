/*
 * Stub planner for the desktop-assistant composer.
 *
 * TODO(desktop-assistant): replace `planTask` with a real backend/IPC call.
 * Keywords in the prompt only pick which canned plan comes back, so every
 * branch of the post-submit flow (one-off / recurring / trigger / complex)
 * can be viewed; the plan contents are fixed.
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
	recurring: boolean;
	trigger?: string;
	/** Service names the task needs connected, e.g. `['Gmail']`. */
	requiredConnections: string[];
	timeSavedMin?: number;
	location: 'cloud' | 'local';
	/** When true the build is routed to the full canvas ("bigger build"). */
	complex: boolean;
}

function makePlan(plan: Omit<Plan, 'summary' | 'location'>): Plan {
	const summary = plan.parts.map((part) => (typeof part === 'string' ? part : part.value)).join('');
	return { ...plan, summary, location: 'cloud' };
}

const CANNED = {
	recurring: makePlan({
		title: 'Weekly email summary',
		icon: '🔁',
		parts: [
			'Every ',
			{ value: 'Friday', options: ['Friday', 'weekday', 'morning'] },
			", I'll ",
			{
				value: 'email you a summary of your week',
				options: ['email you a summary of your week', 'post a summary to Slack'],
			},
			'.',
		],
		recurring: true,
		requiredConnections: ['Gmail'],
		timeSavedMin: 15,
		complex: false,
	}),
	trigger: makePlan({
		title: 'Watch for changes',
		icon: '🔔',
		parts: [
			'When ',
			{
				value: 'something changes',
				options: ['something changes', 'a new file arrives', 'I get a new email'],
			},
			", I'll ",
			{ value: 'let you know', options: ['let you know', 'log it for you'] },
			'.',
		],
		recurring: false,
		trigger: 'On change',
		requiredConnections: [],
		timeSavedMin: 10,
		complex: false,
	}),
	complex: makePlan({
		title: 'Bigger automation',
		icon: '🧩',
		parts: [
			"I'll set up ",
			{ value: 'a multi-step automation' },
			' — connecting a few services and adding some logic along the way.',
		],
		recurring: false,
		requiredConnections: [],
		timeSavedMin: 20,
		complex: true,
	}),
	oneOff: makePlan({
		title: 'Quick task',
		icon: '✨',
		parts: [
			"I'll ",
			{ value: 'take care of that', options: ['take care of that', 'summarise it for you'] },
			' right now.',
		],
		recurring: false,
		requiredConnections: [],
		timeSavedMin: 5,
		complex: false,
	}),
};

/**
 * Fallback plan used when planning fails. Exported so the composer can build
 * the confirmation screen on error.
 */
export function buildFallbackPlan(prompt: string): Plan {
	return makePlan({
		title: prompt.slice(0, 40),
		icon: '✨',
		parts: ["I'll help you: ", { value: prompt }],
		recurring: false,
		requiredConnections: [],
		complex: false,
	});
}

function pickCannedPlan(prompt: string): Plan {
	const lower = prompt.toLowerCase();
	if (prompt.length > 120 || lower.includes(' and then ')) return CANNED.complex;
	if (['every', 'each', 'daily', 'weekly', 'hourly', 'monthly'].some((w) => lower.includes(w))) {
		return CANNED.recurring;
	}
	if (lower.includes('when')) return CANNED.trigger;
	return CANNED.oneOff;
}

/** Simulated planner latency so the pending state is visible. */
const PLAN_DELAY_MS = 900;

/**
 * TODO(desktop-assistant): swap for a backend/IPC planner call.
 * Resolves a canned plan after a short delay.
 */
export async function planTask(prompt: string, context: AssistantContextKind): Promise<Plan> {
	const plan = { ...pickCannedPlan(prompt), location: pickLocation(context) };
	return await new Promise((resolve) => {
		window.setTimeout(() => resolve(plan), PLAN_DELAY_MS);
	});
}

function pickLocation(context: AssistantContextKind): Plan['location'] {
	return context === 'finder' ? 'local' : 'cloud';
}
