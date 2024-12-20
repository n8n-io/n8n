import { escapeMappingString } from '@/utils/mappingUtils';
import type { Completion, CompletionSource } from '@codemirror/autocomplete';
import {
	autocompletableNodeNames,
	longestCommonPrefix,
	prefixMatch,
} from '../../completions/utils';
import { typescriptWorkerFacet } from './facet';
import { blockCommentSnippet, snippets } from './snippets';

const START_CHARACTERS = ['"', "'", '(', '.', '@'];

export const typescriptCompletionSource: CompletionSource = async (context) => {
	const { worker } = context.state.facet(typescriptWorkerFacet);

	let word = context.matchBefore(/[\$\w]+/);
	if (!word?.text) {
		word = context.matchBefore(/[\.\(\'\"\@]/);
	}

	const blockComment = context.matchBefore(/\/\*?\*?/);
	if (blockComment) {
		// Autocomplete a block comment snippet
		return { from: blockComment?.from, options: [blockCommentSnippet] };
	}

	if (!word) return null;

	const completionResult = await worker.getCompletionsAtPos(context.pos);

	if (!completionResult || context.aborted) return null;

	const { result, isGlobal } = completionResult;

	let options = [...result.options];

	if (isGlobal) {
		options = options
			.flatMap((opt) => {
				if (opt.label === '$') {
					return [
						opt,
						...autocompletableNodeNames().map((name) => ({
							...opt,
							label: `$('${escapeMappingString(name)}')`,
						})),
					];
				}
				return opt;
			})
			.concat(snippets);
	}

	return {
		from: word ? (START_CHARACTERS.includes(word.text) ? word.to : word.from) : context.pos,
		filter: false,
		getMatch(completion: Completion) {
			const lcp = longestCommonPrefix(completion.label, word.text);
			return [0, lcp.length];
		},
		options: options.filter(
			(option) =>
				word.text === '' ||
				START_CHARACTERS.includes(word.text) ||
				prefixMatch(option.label, word.text),
		),
	};
};
