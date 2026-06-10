/*
 * Minimal screen-state machine for the desktop assistant.
 *
 * Intentionally tiny and functional — no router, no pinia. A module-scope ref
 * holds the active screen plus its payload so any component can navigate.
 */
import { ref } from 'vue';

import type { Plan } from './planner';

export type AssistantScreen =
	| { name: 'home' }
	| { name: 'draft'; plan: Plan }
	| { name: 'setup'; taskId: string; title: string; icon: string; requiredConnections: string[] }
	| { name: 'complex'; plan: Plan };

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
