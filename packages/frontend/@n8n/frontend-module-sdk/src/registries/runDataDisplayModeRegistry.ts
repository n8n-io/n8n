import { shallowReactive } from 'vue';

import { BUILT_IN_DISPLAY_MODES } from '../runDataDisplayModes';
import type { RunDataDisplayModeContribution } from '../types/runDataDisplayMode';

const builtInIds: ReadonlySet<string> = new Set(BUILT_IN_DISPLAY_MODES);

// The id is also the stored display mode and the telemetry `view` value, so keep it predictable.
const VALID_ID = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/**
 * Shallow-reactive so the select and the run data panel can derive from the
 * registry with a plain `computed`. Shallow on purpose: a contribution's
 * `component` must not be turned into a reactive object.
 */
const displayModes = shallowReactive(new Map<string, RunDataDisplayModeContribution>());

/** All registered display modes, in registration order (the order the select lists them). */
export function getAll(): RunDataDisplayModeContribution[] {
	return [...displayModes.values()];
}

/**
 * Add a display mode. Its `id` must be lowercase kebab-case and not a built-in
 * mode, and one id has one owner.
 */
export function register(contribution: RunDataDisplayModeContribution): void {
	const { id } = contribution;

	if (!VALID_ID.test(id)) {
		console.warn(`Display mode id "${id}" is not lowercase kebab-case. Skipping.`);
		return;
	}

	if (builtInIds.has(id)) {
		console.warn(
			`Display mode "${id}" is a built-in display mode and cannot be registered. Skipping.`,
		);
		return;
	}

	const existing = displayModes.get(id);
	if (existing) {
		// Replaying the same contribution is how a re-login re-runs registration —
		// a no-op, not a collision. Only a different contribution claiming a taken
		// id is worth warning about.
		if (existing !== contribution) {
			console.warn(`Display mode "${id}" is already registered. Skipping.`);
		}
		return;
	}

	displayModes.set(id, contribution);
}

export function unregister(id: string): void {
	displayModes.delete(id);
}

export function get(id: string): RunDataDisplayModeContribution | undefined {
	return displayModes.get(id);
}

export function has(id: string): boolean {
	return displayModes.has(id);
}

/**
 * Remove all registered display modes. Primarily for test isolation.
 */
export function clear(): void {
	displayModes.clear();
}
