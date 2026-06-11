/*
 * Client-side task search.
 *
 * The Tasks view loads the full task set unpaginated, and every card already
 * carries a name and description, so filtering is a pure client-side derivation
 * — no request, no endpoint change. This holds the search-field open/query state
 * plus the matching helpers; the views bind to it.
 */
import { computed, ref } from 'vue';

import type { DesktopAssistantTaskCard, DesktopAssistantTasksResponse } from '../../shared/types';

/** Case-insensitive substring match against the card's name or description.
 *  An empty/whitespace-only query matches everything. */
export function matchesTask(card: DesktopAssistantTaskCard, query: string): boolean {
	const needle = query.trim().toLowerCase();
	if (!needle) return true;
	return (
		card.name.toLowerCase().includes(needle) || card.description.toLowerCase().includes(needle)
	);
}

/** Filter every bucket of a tasks response, preserving its shape. */
export function filterSections(
	sections: DesktopAssistantTasksResponse,
	query: string,
): DesktopAssistantTasksResponse {
	return {
		actionNeeded: sections.actionNeeded.filter((card) => matchesTask(card, query)),
		upcoming: sections.upcoming.filter((card) => matchesTask(card, query)),
		readyToRun: sections.readyToRun.filter((card) => matchesTask(card, query)),
	};
}

/** True when any bucket still has a card — drives the "no tasks match" state. */
export function hasAnyMatch(sections: DesktopAssistantTasksResponse): boolean {
	return (
		sections.actionNeeded.length > 0 ||
		sections.upcoming.length > 0 ||
		sections.readyToRun.length > 0
	);
}

export function useTaskSearch() {
	const open = ref(false);
	const query = ref('');

	/** A non-blank query is "active" — drives hiding recs and the no-match state. */
	const isActive = computed(() => query.value.trim().length > 0);

	function openSearch(): void {
		open.value = true;
	}

	/** Collapse the field and clear the query — the query is ephemeral. */
	function closeSearch(): void {
		open.value = false;
		query.value = '';
	}

	function toggle(): void {
		if (open.value) closeSearch();
		else openSearch();
	}

	return { open, query, isActive, openSearch, closeSearch, toggle };
}
