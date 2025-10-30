import { escapeMappingString } from '@/utils/mappingUtils';
import {
	type CompletionContext,
	insertCompletionText,
	pickedCompletion,
	type Completion,
	type CompletionSource,
} from '@codemirror/autocomplete';
import {
	autocompletableNodeNames,
	longestCommonPrefix,
	prefixMatch,
} from '../../completions/utils';
import { typescriptWorkerFacet } from './facet';
import { blockCommentSnippet, snippets } from './snippets';
import { TARGET_NODE_PARAMETER_FACET } from '../../completions/constants';

const START_CHARACTERS = ['"', "'", '(', '.', '@'];
const START_CHARACTERS_REGEX = /[\.\(\'\"\@]/;

export const matchText = (context: CompletionContext) => {
	let word = context.matchBefore(START_CHARACTERS_REGEX);
	if (!word?.text) {
		word = context.matchBefore(/[\$\w]+/);
	}
	if (!word?.text) {
		word = context.matchBefore(/[\"\'].*/);
	}
	return word;
};

export const typescriptCompletionSource: CompletionSource = async (context) => {
	const { worker } = context.state.facet(typescriptWorkerFacet);
	const targetNodeParameter = context.state.facet(TARGET_NODE_PARAMETER_FACET);
	const word = matchText(context);

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
				if (opt.label === '$()') {
					return [
						opt,
						...autocompletableNodeNames(targetNodeParameter).map((name) => ({
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
		options: options
			.filter(
				(option) =>
					word.text === '' ||
					START_CHARACTERS.includes(word.text) ||
					prefixMatch(
						option.label.replace(START_CHARACTERS_REGEX, ''),
						word.text.replace(START_CHARACTERS_REGEX, ''),
					),
			)
			.map((completion) => {
				if (completion.label.endsWith('()')) {
					completion.apply = (view, _, from, to) => {
						const cursorPosition = from + completion.label.length - 1;
						view.dispatch({
							...insertCompletionText(view.state, completion.label, from, to),
							annotations: pickedCompletion.of(completion),
							selection: { anchor: cursorPosition, head: cursorPosition },
						});
					};
				}
				return completion;
			}),
	};
};
