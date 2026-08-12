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
import { useFilesStore } from '@/features/core/files/files.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { escapeMappingString } from '@/app/utils/mappingUtils';
import {
	METADATA_SECTION,
	PREVIOUS_NODES_SECTION,
	RECOMMENDED_SECTION,
	ROOT_DOLLAR_COMPLETIONS,
	TARGET_NODE_PARAMETER_FACET,
	WORKFLOW_DOCUMENT_FACET,
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

	const targetNodeParameterContext = context.state.facet(TARGET_NODE_PARAMETER_FACET);
	const workflowDocumentId = context.state.facet(WORKFLOW_DOCUMENT_FACET);
	if (!workflowDocumentId) return [];

	if (isInHttpNodePagination(workflowDocumentId)) {
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

	if (!hasActiveNode(workflowDocumentId, targetNodeParameterContext)) {
		return [];
	}

	if (await receivesNoBinaryData(workflowDocumentId, targetNodeParameterContext?.nodeName))
		SKIP.add('$binary');

	const previousNodesCompletions = autocompletableNodeNames(
		workflowDocumentId,
		targetNodeParameterContext,
	).map((nodeName) => {
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
	});

	return recommendedCompletions
		.concat(ROOT_DOLLAR_COMPLETIONS)
		.filter(({ label }) => !SKIP.has(label))
		.concat(previousNodesCompletions, projectFilesCompletions())
		.map((completion) => ({ ...completion, apply: applyCompletion() }));
}

/**
 * `$files` completions (file-storage module): the root callable, `.all()`,
 * and one per-name completion per project file — so typing `$files('`
 * suggests the file names of the workflow's home project, the way `$('`
 * suggests node names. The name list comes from the files store's expression
 * snapshot, fetched on workflow open.
 */
function projectFilesCompletions(): Completion[] {
	if (!useSettingsStore().isModuleActive('file-storage')) return [];

	const rootCompletions: Completion[] = [
		{
			label: '$files()',
			section: METADATA_SECTION,
			info: createInfoBoxRenderer(
				{
					name: '$files',
					returnType: 'Object',
					description: i18n.baseText('codeNodeEditor.completer.$files'),
					args: [
						{
							name: 'name',
							description: i18n.baseText('codeNodeEditor.completer.$files.args.name'),
							type: 'string',
						},
					],
				},
				true,
			),
		},
		{
			label: '$files.all()',
			section: METADATA_SECTION,
			info: createInfoBoxRenderer(
				{
					name: '$files.all',
					returnType: 'Array',
					description: i18n.baseText('codeNodeEditor.completer.$files.all'),
				},
				true,
			),
		},
	];

	const fileNameCompletions = useFilesStore().expressionSnapshot.map((file) => {
		const label = `$files('${escapeMappingString(file.name)}')`;
		return {
			label,
			section: METADATA_SECTION,
			info: createInfoBoxRenderer({
				name: label,
				returnType: 'Object',
				description: i18n.baseText('codeNodeEditor.completer.$files.fileName', {
					interpolate: { name: file.name },
				}),
			}),
		};
	});

	return rootCompletions.concat(fileNameCompletions);
}
