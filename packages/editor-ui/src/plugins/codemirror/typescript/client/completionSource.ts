import { escapeMappingString } from '@/utils/mappingUtils';
import type { CompletionSource } from '@codemirror/autocomplete';
import { autocompletableNodeNames } from '../../completions/utils';
import { typescriptWorkerFacet } from './facet';
import { snippets } from './snippets';

export const typescriptCompletionSource: CompletionSource = async (context) => {
	const { worker } = context.state.facet(typescriptWorkerFacet);
	const { pos } = context;

	let word = context.matchBefore(/[\$\w]+/);
	if (!word?.text) {
		word = context.matchBefore(/[\.\(\'\"]/);
	}

	if (!word) return null;

	const completionResult = await worker.getCompletionsAtPos(context.pos, word?.text ?? '');

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
		from: word ? (['"', "'", '(', '.'].includes(word.text) ? word.to : word.from) : pos,
		options,
	};
};
