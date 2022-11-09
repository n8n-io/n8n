import { CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { syntaxTree } from '@codemirror/language';

// @TODO: Fill in after review

/**
 * Completions available inside the resolvable segment `{{ ... }}` of an n8n expression.
 */
export function resolvableCompletions(context: CompletionContext): CompletionResult | null {
	const nodeBefore = syntaxTree(context.state).resolveInner(context.pos, -1);

	if (nodeBefore.name !== 'Resolvable') return null;

	const textBefore = context.state.sliceDoc(nodeBefore.from, context.pos);

	const tagBefore = /a/.exec(textBefore);

	if (!tagBefore) return null;

	return {
		from: nodeBefore.from + tagBefore.index,
		options: [{ label: 'autocompletion', info: 'Description of autocompletion' }],
	};
}
