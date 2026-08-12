import { resolveValue } from './expressions';
import { APP_STATE_KEY } from './pages';
import { writePath } from './state';
import type { UiScope, UiState, UiWebhookStep } from './types';

/**
 * What a webhook step sends. Where its reply goes is not here: the reply
 * becomes `$response` for the rest of the chain, and a `set` step places it.
 */

/**
 * `$app` is the client's account of its own context. A response writing into it
 * would be worse than not writing at all, so nothing may name it — not an
 * input's `model`, not a `set` step's path.
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

/** What a step posts: whatever its body expression produces, or all of state. */
export function requestBody(step: UiWebhookStep, scope: UiScope): unknown {
	return step.request ? resolveValue(step.request, scope) : scope.$state;
}
