import { ifIn } from '@codemirror/autocomplete';
import type { ExpressionCompletionSource } from '@n8n/expression-editor';

import { blankCompletions } from './blank.completions';
import { bracketAccessCompletions } from './bracketAccess.completions';
import { datatypeCompletions } from './datatype.completions';
import { dollarCompletions } from './dollar.completions';
import { nonDollarCompletions } from './nonDollar.completions';

/** Unwrapped, for `n8nLang`, which scopes them to `Resolvable` itself. */
export const n8nCompletionSourceFns: readonly ExpressionCompletionSource[] = [
	blankCompletions,
	bracketAccessCompletions,
	datatypeCompletions,
	dollarCompletions,
	nonDollarCompletions,
];

/** Scoped to `Resolvable`, for host languages that embed n8n expressions. */
export function n8nCompletionSources() {
	return n8nCompletionSourceFns.map((source) => ({
		autocomplete: ifIn(['Resolvable'], source),
	}));
}
