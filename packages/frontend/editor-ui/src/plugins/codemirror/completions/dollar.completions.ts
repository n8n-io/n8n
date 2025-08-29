import { i18n } from '@n8n/i18n';
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
import {
	METADATA_SECTION,
	PREVIOUS_NODES_SECTION,
	RECOMMENDED_SECTION,
	ROOT_DOLLAR_COMPLETIONS,
	TARGET_NODE_PARAMETER_FACET,
} from './constants';
import { createInfoBoxRenderer } from './infoBoxRenderer';

/**
 * Completions offered at the dollar position: `$|`
 */
export function dollarCompletions(context: CompletionContext): CompletionResult | null {
	const word = context.matchBefore(/\$[^$]*/);

	if (!word) return null;

	if (word.from === word.to && !context.explicit) return null;

	let options = dollarOptions(context).map(stripExcessParens(context));

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

export function dollarOptions(context: CompletionContext): Completion[] {
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
					docURL: 'https://docs.n8n.io/code/builtin/http-node-variables/',
					description: i18n.baseText('codeNodeEditor.completer.$pageCount'),
				}),
			},
			{
				label: '$response',
				section: RECOMMENDED_SECTION,
				info: createInfoBoxRenderer({
					name: '$response',
					returnType: 'HTTPResponse',
					docURL: 'https://docs.n8n.io/code/builtin/http-node-variables/',
					description: i18n.baseText('codeNodeEditor.completer.$response'),
				}),
			},
			{
				label: '$request',
				section: RECOMMENDED_SECTION,
				info: createInfoBoxRenderer({
					name: '$request',
					returnType: 'Object',
					docURL: 'https://docs.n8n.io/code/builtin/http-node-variables/',
					description: i18n.baseText('codeNodeEditor.completer.$request'),
				}),
			},
		];
	}

	if (isCredentialsModalOpen()) {
		return useExternalSecretsStore().isEnterpriseExternalSecretsEnabled
			? [
					{
						label: '$vars',
						section: METADATA_SECTION,
						info: createInfoBoxRenderer({
							name: '$vars',
							returnType: 'Object',
							description: i18n.baseText('codeNodeEditor.completer.$vars'),
						}),
					},
					{
						label: '$secrets',
						section: METADATA_SECTION,
						info: createInfoBoxRenderer({
							name: '$secrets',
							returnType: 'Object',
							description: i18n.baseText('codeNodeEditor.completer.$secrets'),
						}),
					},
				]
			: [];
	}

	const targetNodeParameterContext = context.state.facet(TARGET_NODE_PARAMETER_FACET);

	if (!hasActiveNode(targetNodeParameterContext)) {
		return [];
	}

	if (receivesNoBinaryData(targetNodeParameterContext?.nodeName)) SKIP.add('$binary');

	const previousNodesCompletions = autocompletableNodeNames(targetNodeParameterContext).map(
		(nodeName) => {
			const label = `$('${escapeMappingString(nodeName)}')`;
			return {
				label,
				info: createInfoBoxRenderer({
					name: label,
					returnType: 'Object',
					description: i18n.baseText('codeNodeEditor.completer.$()', { interpolate: { nodeName } }),
				}),
				section: PREVIOUS_NODES_SECTION,
			};
		},
	);

	return recommendedCompletions
		.concat(ROOT_DOLLAR_COMPLETIONS)
		.filter(({ label }) => !SKIP.has(label))
		.concat(previousNodesCompletions)
		.map((completion) => ({ ...completion, apply: applyCompletion() }));
}
