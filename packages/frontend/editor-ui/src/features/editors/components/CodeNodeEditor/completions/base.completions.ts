import { NODE_TYPES_EXCLUDED_FROM_AUTOCOMPLETION } from '../constants';
import { addInfoRenderer } from '../utils';
import { addVarType } from '@/features/environments.ee/completions/variables.completions';
import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import type { INodeUi } from '@/Interface';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { escapeMappingString } from '@/utils/mappingUtils';
import { useI18n } from '@n8n/i18n';

function getAutoCompletableNodeNames(nodes: INodeUi[]) {
	return nodes
		.filter((node: INodeUi) => !NODE_TYPES_EXCLUDED_FROM_AUTOCOMPLETION.includes(node.type))
		.map((node: INodeUi) => node.name);
}

export function useBaseCompletions(
	mode: 'runOnceForEachItem' | 'runOnceForAllItems',
	language: string,
) {
	const i18n = useI18n();
	const workflowsStore = useWorkflowsStore();

	const itemCompletions = (context: CompletionContext): CompletionResult | null => {
		const preCursor = context.matchBefore(/i\w*/);

		if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) return null;

		const options: Completion[] = [];

		if (mode === 'runOnceForEachItem') {
			options.push({
				label: 'item',
				info: i18n.baseText('codeNodeEditor.completer.$input.item'),
			});
		} else if (mode === 'runOnceForAllItems') {
			options.push({
				label: 'items',
				info: i18n.baseText('codeNodeEditor.completer.$input.all'),
			});
		}

		return {
			from: preCursor.from,
			options,
		};
	};

	/**
	 * - Complete `$` to `$execution $input $prevNode $runIndex $workflow $now $today
	 * $jmespath $ifEmpt $('nodeName')` in both modes.
	 * - Complete `$` to `$json $binary $itemIndex` in single-item mode.
	 */
	const baseCompletions = (context: CompletionContext): CompletionResult | null => {
		const prefix = language === 'python' ? '_' : '$';
		const preCursor = context.matchBefore(new RegExp(`\\${prefix}\\w*`));

		if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) return null;

		const TOP_LEVEL_COMPLETIONS_IN_BOTH_MODES: Completion[] = [
			{
				label: `${prefix}execution`,
				info: i18n.baseText('codeNodeEditor.completer.$execution'),
			},
			{
				label: `${prefix}ifEmpty()`,
				info: i18n.baseText('codeNodeEditor.completer.$ifEmpty'),
			},
			{ label: `${prefix}input`, info: i18n.baseText('codeNodeEditor.completer.$input') },
			{
				label: `${prefix}prevNode`,
				info: i18n.baseText('codeNodeEditor.completer.$prevNode'),
			},
			{
				label: `${prefix}workflow`,
				info: i18n.baseText('codeNodeEditor.completer.$workflow'),
			},
			{
				label: `${prefix}vars`,
				info: i18n.baseText('codeNodeEditor.completer.$vars'),
			},
			{
				label: `${prefix}now`,
				info: i18n.baseText('codeNodeEditor.completer.$now'),
			},
			{
				label: `${prefix}today`,
				info: i18n.baseText('codeNodeEditor.completer.$today'),
			},
			{
				label: `${prefix}jmespath()`,
				info: i18n.baseText('codeNodeEditor.completer.$jmespath'),
			},
			{
				label: `${prefix}runIndex`,
				info: i18n.baseText('codeNodeEditor.completer.$runIndex'),
			},
			{
				label: `${prefix}nodeVersion`,
				info: i18n.baseText('codeNodeEditor.completer.$nodeVersion'),
			},
		];

		const options: Completion[] = TOP_LEVEL_COMPLETIONS_IN_BOTH_MODES.map(addVarType);

		options.push(
			...getAutoCompletableNodeNames(workflowsStore.allNodes).map((nodeName) => {
				return {
					label: `${prefix}('${escapeMappingString(nodeName)}')`,
					type: 'variable',
					info: i18n.baseText('codeNodeEditor.completer.$()', {
						interpolate: { nodeName },
					}),
				};
			}),
		);

		if (mode === 'runOnceForEachItem') {
			const TOP_LEVEL_COMPLETIONS_IN_SINGLE_ITEM_MODE = [
				{ label: `${prefix}json` },
				{ label: `${prefix}binary` },
				{
					label: `${prefix}itemIndex`,
					info: i18n.baseText('codeNodeEditor.completer.$itemIndex'),
				},
			];

			options.push(...TOP_LEVEL_COMPLETIONS_IN_SINGLE_ITEM_MODE.map(addVarType));
		}

		return {
			from: preCursor.from,
			options: options.map(addInfoRenderer),
		};
	};

	/**
	 * Complete `$(` to `$('nodeName')`.
	 */
	const nodeSelectorCompletions = (context: CompletionContext): CompletionResult | null => {
		const prefix = language === 'python' ? '_' : '$';
		const preCursor = context.matchBefore(new RegExp(`\\${prefix}\\(.*`));

		if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) return null;

		const options: Completion[] = getAutoCompletableNodeNames(workflowsStore.allNodes).map(
			(nodeName) => {
				return {
					label: `${prefix}('${escapeMappingString(nodeName)}')`,
					type: 'variable',
					info: i18n.baseText('codeNodeEditor.completer.$()', {
						interpolate: { nodeName },
					}),
				};
			},
		);

		return {
			from: preCursor.from,
			options,
		};
	};

	return {
		itemCompletions,
		baseCompletions,
		nodeSelectorCompletions,
	};
}
