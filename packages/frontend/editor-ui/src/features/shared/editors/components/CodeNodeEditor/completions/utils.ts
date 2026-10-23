import type { CompletionContext } from '@codemirror/autocomplete';

export const matchBeforeCursor = (context: CompletionContext, pattern: RegExp) => {
	const preCursor = context.matchBefore(pattern);
	return !preCursor || (preCursor.from === preCursor.to && !context.explicit) ? null : preCursor;
};
