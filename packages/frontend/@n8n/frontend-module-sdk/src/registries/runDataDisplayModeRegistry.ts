import { shallowReactive } from 'vue';

import { BUILT_IN_DISPLAY_MODES } from '../runDataDisplayModes';
import type { RunDataDisplayModeContribution } from '../types/runDataDisplayMode';

const builtInIds: ReadonlySet<string> = new Set(BUILT_IN_DISPLAY_MODES);

/**
 * Shallow-reactive so the select and the run data panel can derive from the
 * registry with a plain `computed`. Shallow on purpose: a contribution's
 * `component` must not be turned into a reactive object.
 */
const displayModes = shallowReactive(new Map<string, RunDataDisplayModeContribution>());
const listeners = new Set<(entries: RunDataDisplayModeContribution[]) => void>();

/** All registered display modes, in registration order (the order the select lists them). */
export function getAll(): RunDataDisplayModeContribution[] {
	return [...displayModes.values()];
}

function notifyListeners(): void {
	listeners.forEach((listener) => listener(getAll()));
}

/**
 * Add a display mode. Its `id` must not be a built-in mode, and one id has one owner.
 */
export function register(contribution: RunDataDisplayModeContribution): void {
	if (builtInIds.has(contribution.id)) {
		console.warn(
			`Display mode "${contribution.id}" is a built-in display mode and cannot be registered. Skipping.`,
		);
		return;
	}

	const existing = displayModes.get(contribution.id);
	if (existing) {
		// Replaying the same contribution is how a re-login re-runs registration —
		// a no-op, not a collision. Only a different contribution claiming a taken
		// id is worth warning about.
		if (existing !== contribution) {
			console.warn(`Display mode "${contribution.id}" is already registered. Skipping.`);
		}
		return;
	}

	displayModes.set(contribution.id, contribution);
	notifyListeners();
}

export function unregister(id: string): void {
	if (displayModes.delete(id)) {
		notifyListeners();
	}
}

export function get(id: string): RunDataDisplayModeContribution | undefined {
	return displayModes.get(id);
}

export function has(id: string): boolean {
	return displayModes.has(id);
}

export function subscribe(
	listener: (entries: RunDataDisplayModeContribution[]) => void,
): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/**
 * Remove all registered display modes. Primarily for test isolation.
 */
export function clear(): void {
	displayModes.clear();
	notifyListeners();
}
