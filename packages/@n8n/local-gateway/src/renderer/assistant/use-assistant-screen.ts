/*
 * Minimal screen-state machine for the desktop assistant.
 *
 * Intentionally tiny and functional — no router, no pinia. A module-scope ref
 * holds the active screen plus its payload so any component can navigate.
 */
import { ref } from 'vue';

import type { DesktopAssistantTaskCard, DesktopAssistantTaskPlan } from '../../shared/types';

/** Which task-list section a card came from; drives the detail view's badge + CTA. */
export type TaskCardVariant = 'actionNeeded' | 'upcoming' | 'readyToRun';

export type AssistantScreen =
	| { name: 'home' }
	// The plan the one-shot agent proposed instead of executing; the draft view
	// lets the user tweak it, then promotes `threadId` with the configured parts.
	| { name: 'draft'; threadId: string; plan: DesktopAssistantTaskPlan }
	| { name: 'setup'; title: string; icon: string; requiredConnections: string[] }
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
