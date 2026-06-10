/*
 * Stub planner for the desktop-assistant composer.
 *
 * TODO(desktop-assistant): replace `planTask` with a real backend/IPC call
 * (the prototype POSTs to `/api/plan`). This is throwaway demo plumbing: a few
 * keyword checks pick which plan variant to return so every branch of the
 * post-submit flow (one-off / recurring / trigger / complex) can be viewed.
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

function summarise(parts: PlanPart[]): string {
	return parts.map((part) => (typeof part === 'string' ? part : part.value)).join('');
}

function toTitle(prompt: string): string {
	const title = prompt.trim().slice(0, 40);
	return title.charAt(0).toUpperCase() + title.slice(1);
}

/**
 * Fallback plan used when planning fails. Exported so the composer can build
 * the confirmation screen on error.
 */
export function buildFallbackPlan(prompt: string): Plan {
	const parts: PlanPart[] = ["I'll help you: ", { value: prompt }];
	return {
		title: toTitle(prompt),
		icon: '✨',
		parts,
		summary: summarise(parts),
		recurring: false,
		requiredConnections: [],
		location: 'cloud',
		complex: false,
	};
}

function buildMockPlan(prompt: string, context: AssistantContextKind): Plan {
	const lower = prompt.toLowerCase();
	const recurring = ['every', 'each', 'daily', 'weekly', 'hourly', 'monthly'].some((word) =>
		lower.includes(word),
	);
	const complex = prompt.length > 120 || lower.includes(' and then ');
	const requiredConnections = [
		lower.includes('mail') ? 'Gmail' : undefined,
		lower.includes('slack') ? 'Slack' : undefined,
	].filter((service): service is string => !!service);

	const base = {
		...buildFallbackPlan(prompt),
		requiredConnections,
		location: context === 'finder' ? ('local' as const) : ('cloud' as const),
		timeSavedMin: 10,
	};
	const chip = { value: prompt, options: [prompt, 'summarise it for me'] };

	if (complex) {
		const parts: PlanPart[] = [
			"I'll help you: ",
			chip,
			' — connecting a few services and adding some logic along the way.',
		];
		return { ...base, icon: '🧩', parts, summary: summarise(parts), complex: true };
	}
	if (recurring) {
		const parts: PlanPart[] = [
			'Every ',
			{ value: 'weekday', options: ['weekday', 'morning', 'Monday'] },
			", I'll help you: ",
			chip,
			'.',
		];
		return {
			...base,
			icon: '🔁',
			parts,
			summary: summarise(parts),
			recurring: true,
		};
	}
	if (lower.includes('when')) {
		const parts: PlanPart[] = [
			'When ',
			{ value: 'something changes', options: ['something changes', 'I get a new email'] },
			", I'll help you: ",
			chip,
			'.',
		];
		return {
			...base,
			icon: '🔔',
			parts,
			summary: summarise(parts),
			trigger: 'On change',
		};
	}
	const parts: PlanPart[] = ["I'll help you: ", chip, ' right now.'];
	return { ...base, parts, summary: summarise(parts) };
}

/** Simulated planner latency so the pending state is visible. */
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
