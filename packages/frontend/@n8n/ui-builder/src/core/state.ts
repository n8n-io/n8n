import { isPlainObject, set } from 'lodash';

import type { UiState } from './types';

/**
 * Merges an action's response into app state. Plain objects merge recursively;
 * everything else (arrays, primitives) replaces wholesale, so a workflow
 * returning a fresh list of rows does not end up merging it index by index.
 *
 * PoC limits: there is no way to delete a key, and concurrent responses land in
 * arrival order with no last-write protection.
 */
export function deepMerge(target: UiState, source: unknown): void {
	if (!isPlainObject(source)) return;

	for (const [key, value] of Object.entries(source as UiState)) {
		const existing = target[key];

		if (isPlainObject(existing) && isPlainObject(value)) {
			deepMerge(existing as UiState, value);
		} else {
			target[key] = value;
		}
	}
}

/** Writes a `model` prop's dotted path, e.g. `form.name`. */
export function writePath(state: UiState, path: string, value: unknown): void {
	if (!path) return;
	set(state, path, value);
}
