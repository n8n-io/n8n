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
import { useExternalSecretsStore } from '@/features/integrations/externalSecrets.ee/externalSecrets.ee.store';
import { escapeMappingString } from '@/app/utils/mappingUtils';
import {
	CRDT_AUTOCOMPLETE_RESOLVER_FACET,
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
export async function dollarCompletions(
	context: CompletionContext,
): Promise<CompletionResult | null> {
	const word = context.matchBefore(/\$[^$]*/);

	if (!word) return null;

	if (word.from === word.to && !context.explicit) return null;

	let options = (await dollarOptions(context)).map(stripExcessParens(context));

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

export async function dollarOptions(context: CompletionContext): Promise<Completion[]> {
	const SKIP = new Set();
	let recommendedCompletions: Completion[] = [];

	// Check if we're in CRDT mode - if so, skip store-based checks
	const crdtResolver = context.state.facet(CRDT_AUTOCOMPLETE_RESOLVER_FACET);
	const isCrdtMode = crdtResolver !== undefined;

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

	// In CRDT mode, we have node context via facet; in standard mode, check stores
	if (!isCrdtMode && !hasActiveNode(targetNodeParameterContext)) {
		return [];
	}

	// In CRDT mode, skip binary check (would need async resolution)
	// In standard mode, check if node receives binary data
	if (!isCrdtMode && (await receivesNoBinaryData(targetNodeParameterContext?.nodeName))) {
		SKIP.add('$binary');
	}

	// In CRDT mode, skip previous nodes completions (would need workflow structure from coordinator)
	// TODO: Add CRDT-aware previous nodes lookup via coordinator
	let previousNodesCompletions: Completion[] = [];
	if (!isCrdtMode) {
		previousNodesCompletions = autocompletableNodeNames(targetNodeParameterContext).map(
			(nodeName) => {
				const label = `$('${escapeMappingString(nodeName)}')`;
				return {
					label,
					info: createInfoBoxRenderer({
						name: label,
						returnType: 'Object',
						description: i18n.baseText('codeNodeEditor.completer.$()', {
							interpolate: { nodeName },
						}),
					}),
					section: PREVIOUS_NODES_SECTION,
				};
			},
		);
	}

	return recommendedCompletions
		.concat(ROOT_DOLLAR_COMPLETIONS)
		.filter(({ label }) => !SKIP.has(label))
		.concat(previousNodesCompletions)
		.map((completion) => ({ ...completion, apply: applyCompletion() }));
}
