import { escapeMappingString } from '@/app/utils/mappingUtils';
import {
	type CompletionContext,
	insertCompletionText,
	pickedCompletion,
	type Completion,
	type CompletionSource,
} from '@codemirror/autocomplete';
import { autocompletableNodeNames, longestCommonPrefix } from '../../completions/utils';
import { typescriptWorkerFacet } from './facet';
import { blockCommentSnippet, snippets } from './snippets';
import { TARGET_NODE_PARAMETER_FACET } from '../../completions/constants';
import type { AliasCompletion, Alias } from 'n8n-workflow';
import { sortCompletionsByInput } from '../../completions/datatype.completions';

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

	let options: AliasCompletion[] = [...result.options];

	const addAlias = (label: string, alias: Alias[]) => {
		const completionIndex = options.findIndex((opt) => opt.label === label);
		if (completionIndex !== -1) {
			options[completionIndex].alias = alias;
		}
	};

	// array aliases
	addAlias('push()', [
		{
			label: 'append()',
			info: 'Use push() to add one or more elements to the end of an array',
		},
	]);
	addAlias('pop()', [
		{ label: 'remove()', info: 'Use pop() to remove the last element from an array' },
	]);
	addAlias('splice()', [
		{
			label: 'insertAt()',
			info: 'Use splice(index, 0, value) to insert elements at a specified index in an array',
		},
		{
			label: 'removeAt()',
			info: 'Use splice(indexOf(itemToRemove), 1) to remove elements from an array',
		},
	]);
	addAlias('concat()', [{ label: 'extend()', info: 'Use concat() to merge two or more arrays' }]);
	addAlias('includes()', [
		{ label: 'contains()', info: 'Use includes() to check if an array contains a value' },
		{ label: 'has()', info: 'Use includes() to check if an array contains a value' },
	]);

	// string aliases
	addAlias('toLowerCase()', [{ label: 'lower()' }]);
	addAlias('toUpperCase()', [{ label: 'upper()' }]);

	addAlias('length', [
		{ label: 'size', mode: 'exact' },
		{ label: 'count', mode: 'exact' },
	]);

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

	const filteredOptions: AliasCompletion[] = [];
	for (const { option, order, alias } of sortCompletionsByInput(options, word.text)) {
		const isEmpty = word.text === '';
		const isStartCharacter = START_CHARACTERS.includes(word.text);
		const isMatch = order > 0;

		// replace the default description with the alias description
		if (alias?.info) {
			option.info = alias.info;
		}

		if (isEmpty || isStartCharacter || isMatch) {
			filteredOptions.push(option);
		}
	}

	return {
		from: word ? (START_CHARACTERS.includes(word.text) ? word.to : word.from) : context.pos,
		filter: false,
		getMatch(completion: Completion) {
			const lcp = longestCommonPrefix(completion.label, word.text);
			return [0, lcp.length];
		},
		options: filteredOptions.map((completion) => {
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
