import { set } from 'lodash';

import type { UiState } from './types';

/** Writes a dotted path, e.g. `form.name`. */
export function writePath(state: UiState, path: string, value: unknown): void {
	if (!path) return;
	set(state, path, value);
}
