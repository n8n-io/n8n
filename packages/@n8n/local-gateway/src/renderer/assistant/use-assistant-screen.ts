/*
 * Minimal screen-state machine for the desktop assistant.
 *
 * Intentionally tiny and functional — no router, no pinia. A module-scope ref
 * holds the active screen plus its payload so any component can navigate.
 */
import { ref } from 'vue';

import type { DesktopAssistantTaskCard } from '../../shared/types';

/** A natural-language sentence segment. Object parts render as inline chip pickers. */
export type PlanPart = string | { value: string; options?: string[] };

/**
 * A drafted automation plan, as shown on the draft/complex screens. Nothing
 * produces these today; the screens (and this payload shape) are kept for the
 * upcoming guided-build flow.
 */
export interface Plan {
	title: string;
	/** Emoji glyph, defaults to ✨. */
	icon: string;
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

/** Which task-list section a card came from; drives the detail view's badge + CTA. */
export type TaskCardVariant = 'actionNeeded' | 'upcoming' | 'readyToRun';

export type AssistantScreen =
	| { name: 'home' }
	| { name: 'draft'; plan: Plan }
	| { name: 'setup'; title: string; icon: string; requiredConnections: string[] }
	| { name: 'complex'; plan: Plan }
	// Carries the card so the header/badge render instantly while the
	// description is fetched/generated.
	| { name: 'task-detail'; card: DesktopAssistantTaskCard; variant: TaskCardVariant };

const screen = ref<AssistantScreen>({ name: 'home' });

export function useAssistantScreen() {
	function goTo(next: AssistantScreen) {
		screen.value = next;
	}

	function goHome() {
		screen.value = { name: 'home' };
	}

	return { screen, goTo, goHome };
}
