import { i18n } from '@/plugins/i18n';
import {
	autocompletableNodeNames,
	receivesNoBinaryData,
	longestCommonPrefix,
	prefixMatch,
	stripExcessParens,
	hasActiveNode,
	isCredentialsModalOpen,
	applyCompletion,
	isInHttpNodePagination,
} from './utils';
import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { useExternalSecretsStore } from '@/stores/externalSecrets.ee.store';
import { escapeMappingString } from '@/utils/mappingUtils';
import { PREVIOUS_NODES_SECTION, RECOMMENDED_SECTION, ROOT_DOLLAR_COMPLETIONS } from './constants';
import { createInfoBoxRenderer } from './infoBoxRenderer';

/**
 * Completions offered at the dollar position: `$|`
 */
export function dollarCompletions(context: CompletionContext): CompletionResult | null {
	const word = context.matchBefore(/\$[^$]*/);

	if (!word) return null;

	if (word.from === word.to && !context.explicit) return null;

	let options = dollarOptions().map(stripExcessParens(context));

	const userInput = word.text;

	if (userInput !== '$') {
		options = options.filter((o) => prefixMatch(o.label, userInput));
	}

	if (options.length === 0) return null;

	return {
		from: word.to - userInput.length,
		options,
		filter: false,
		getMatch(completion: Completion) {
			const lcp = longestCommonPrefix(userInput, completion.label);

			return [0, lcp.length];
		},
	};
}

export function dollarOptions(): Completion[] {
	const SKIP = new Set();
	let recommendedCompletions: Completion[] = [];

	if (isInHttpNodePagination()) {
		recommendedCompletions = [
			{
				label: '$pageCount',
				section: RECOMMENDED_SECTION,
				info: createInfoBoxRenderer({
					name: '$pageCount',
					returnType: 'number',
					description: i18n.rootVars.$pageCount,
				}),
			},
			{
				label: '$response',
				section: RECOMMENDED_SECTION,
				info: createInfoBoxRenderer({
					name: '$response',
					returnType: 'object',
					description: i18n.rootVars.$response,
				}),
			},
			{
				label: '$request',
				section: RECOMMENDED_SECTION,
				info: createInfoBoxRenderer({
					name: '$request',
					returnType: 'object',
					description: i18n.rootVars.$request,
				}),
			},
		];
	}

	if (isCredentialsModalOpen()) {
		return useExternalSecretsStore().isEnterpriseExternalSecretsEnabled
			? [
					{
						label: '$secrets',
						type: 'keyword',
					},
					{
						label: '$vars',
						type: 'keyword',
					},
				]
			: [];
	}

	if (!hasActiveNode()) {
		return [];
	}

	if (receivesNoBinaryData()) SKIP.add('$binary');

	const previousNodesCompletions = autocompletableNodeNames().map((nodeName) => {
		const label = `$('${escapeMappingString(nodeName)}')`;
		return {
			label,
			info: createInfoBoxRenderer({
				name: label,
				returnType: 'object',
				description: i18n.baseText('codeNodeEditor.completer.$()', { interpolate: { nodeName } }),
			}),
			section: PREVIOUS_NODES_SECTION,
		};
	});

	return recommendedCompletions
		.concat(ROOT_DOLLAR_COMPLETIONS)
		.filter(({ label }) => !SKIP.has(label))
		.concat(previousNodesCompletions)
		.map((completion) => ({ ...completion, apply: applyCompletion() }));
}
