import { get } from 'lodash';

import { APP_STATE_KEY } from './pages';
import { writePath } from './state';
import type { UiResponseBinding, UiState, UiWebhookStep } from './types';

/**
 * The two ends of a webhook step: what state it sends, and where the reply
 * lands. Both live on the step rather than in the workflow, so the workflow
 * answers with whatever its nodes produce and the app does the adapting.
 */

/**
 * `$app` is the client's account of its own context. A response writing into it
 * would be worse than not writing at all, so nothing may name it — not an
 * input's `model`, not a step's `response`.
 */
export function writeState(state: UiState, path: string, value: unknown): boolean {
	if (!path) return false;

	if (path.split('.')[0] === APP_STATE_KEY) {
		console.warn('[ui-builder] refusing to write into', APP_STATE_KEY, path);
		return false;
	}

	writePath(state, path, value);
	return true;
}

/** What a step posts: the part of state it names, or all of it. */
export function requestBody(state: UiState, step: UiWebhookStep): unknown {
	return step.request ? get(state, step.request) : state;
}

/** Puts a reply where the step says it goes. Returns the state paths written. */
export function placeResponse(
	state: UiState,
	binding: UiResponseBinding | undefined,
	body: unknown,
): string[] {
	if (!binding) return [];

	const pairs: Array<[string, string]> =
		typeof binding === 'string' ? [[binding, '']] : Object.entries(binding);

	return pairs
		.filter(([path, from]) => writeState(state, path, from ? get(body, from) : body))
		.map(([path]) => path);
}
