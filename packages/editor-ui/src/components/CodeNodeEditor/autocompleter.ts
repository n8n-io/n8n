import Vue from 'vue';

import {
	autocompletion,
	completeFromList,
	CompletionContext,
	CompletionResult,
	snippetCompletion,
} from '@codemirror/autocomplete';
import { snippets as nativeJsSnippets } from '@codemirror/lang-javascript';

import type { Extension } from '@codemirror/state';
import type { CodeNodeEditorMixin } from './types';
import type { INodeUi } from '@/Interface';

// @TODO: Go back one char after call autocompletion
// @TODO: Disable closing brace matching during autocompletion

const N8N_FUNCTIONS = [
	{ label: '$evaluateExpression()', info: 'expression: string, itemIndex?: number' },
	{ label: '$getNodeParameter()', info: 'paramName: string, itemIndex: number' },
	{ label: '$getWorkflowStaticData()', info: "type: 'global' | 'node'" },
	{ label: '$item()', info: 'itemIndex: number, runIndex?: number' },
	{ label: '$items()', info: 'nodeName?: string, outputIndex?: number, runIndex?: number' },
	{ label: '$input.first()', info: 'First input item of this node' },
	{ label: '$input.last()', info: 'Last input item of this node' },
	{ label: '$input.all()', info: 'All input items of this node' },
	{ label: '$input.item(index)', info: 'Specific input item of this node' },
	{ label: '$jmespath()', info: 'jsObject: object, path: string' },
];

const N8N_GENERAL_VARS = [
	{ label: '$env', info: 'Environment variables' },
	{ label: '$executionId', info: 'ID of the current execution' },
	{ label: '$mode', info: 'Workflow execution mode' },
	{ label: '$node', info: 'Item from a node - first output, last run' },
	{ label: '$nodeItem', info: 'Item received by this Code node' },
	{ label: '$nodeItems', info: 'Items received by this Code node' },
	{ label: '$parameter', info: 'Parameters of current node' },
	{ label: '$resumeWebhookUrl', info: 'Webhook URL to call to resume a waiting workflow' },
	{ label: '$workflow', info: 'Workflow metadata' },
	{ label: '$now', info: 'Current date and time' },
	{ label: '$today', info: 'Current date' },
	{ label: '$runIndex', info: 'Index of the current run' },
];

const N8N_EACH_ITEM_VARS = [
	{ label: '$json', info: "Data in the item's `json` key" },
	{ label: '$binary', info: "Data in the item's `binary` key" },
	{ label: '$position', info: 'Index of the item in its array' },
];

const NODE_NAMES_EXCLUDED_FROM_AUTOCOMPLETION = ['_QUICKSTART_NOTE_'];

export const autocompleterExtension = (Vue as CodeNodeEditorMixin).extend({
	computed: {
		autocompletableNodeNames(): string[] {
			return this.$store.getters.allNodes
				.filter(({ name }: INodeUi) => !NODE_NAMES_EXCLUDED_FROM_AUTOCOMPLETION.includes(name))
				.map(({ name }: INodeUi) => name);
		},
	},
	methods: {
		autocompletionExtension(): Extension {
			return autocompletion({
				override: [
					this.dollarSignCompletions, // $env
					this.nodeSelectorCompletions, // $(
					this.nodeAccessorCompletions, // $node[
					this.selectedNodeCompletions, // $(nodeName).
					this.accessedNodeCompletions, // $node['nodeName'].
					this.$nodeItemCompletions, // $nodeItem.
					this.$nodeItemsCompletions, // $nodeItems.
					this.jsSnippets(),
				],
			});
		},
		dollarSignCompletions(context: CompletionContext): CompletionResult | null {
			const stub = context.matchBefore(/\$\w*/);

			if (!stub || (stub.from === stub.to && !context.explicit)) return null;

			const options = [
				...N8N_FUNCTIONS.map(({ label, info }) => ({ label, type: 'function', info })),
				...N8N_GENERAL_VARS.map(({ label, info }) => ({ label, type: 'variable', info })),
			];

			if (this.mode === 'runOnceForEachItem') {
				options.push(
					...N8N_EACH_ITEM_VARS.map(({ label, info }) => ({ label, type: 'variable', info })),
				);
			}

			return {
				from: stub.from,
				options,
			};
		},

		// ✅ DONE: $( -> $('nodeName)

		// ✅ DONE: $node[ -> $node['nodeName']

		// ✅ DONE: $('nodeName'). -> .first(), .last(), all(), .item(index)

		// ✅ DONE: $node['nodeName']. -> .json / .pairedItem / .binary / .runIndex

		// ✅ DONE: $nodeItem. -> .json / .pairedItem / .binary / .runIndex

		// ✅ @TODO: $nodeItems[i]. -> .json / .pairedItem / .binary / .runIndex

		// @TODO: $items(n)[i]. -> .json / .pairedItem / .binary / .runIndex
		// @TODO: $item(n). -> .json / .pairedItem / .binary / .runIndex

		// @TODO: *.json. -> *.json['someField']
		// @TODO: *.json[ -> *.json['someField']

		/**
		 * $( -> $('nodeName')
		 */
		nodeSelectorCompletions(context: CompletionContext): CompletionResult | null {
			const stub = context.matchBefore(/\$\(.*/);

			if (!stub || (stub.from === stub.to && !context.explicit)) return null;

			const options = this.autocompletableNodeNames.map((name) => {
				return {
					label: `$('${name}')`,
					type: 'variable',
					info: `Reference to node named ${name}`,
				};
			});

			return {
				from: stub.from,
				options,
			};
		},

		/**
		 * $node[ -> $node['nodeName']
		 */
		nodeAccessorCompletions(context: CompletionContext): CompletionResult | null {
			const stub = context.matchBefore(/\$node\[.*/);

			if (!stub || (stub.from === stub.to && !context.explicit)) return null;

			const options = this.autocompletableNodeNames.map((name) => {
				return {
					label: `$node['${name}']`,
					type: 'variable',
					info: `Item of node named ${name} that matches current item at last run`,
				};
			});

			return {
				from: stub.from,
				options,
			};
		},

		/**
		 * $('nodeName') -> $('nodeName').first()
		 */
		selectedNodeCompletions(context: CompletionContext): CompletionResult | null {
			const SELECTED_NODE_REGEX = /\$\((?<quotedNodeName>['"]\w+['"])\)\./;

			const match = context.state.doc.toString().match(SELECTED_NODE_REGEX);

			if (!match || !match.groups || !match.groups.quotedNodeName) return null;

			const stub = context.matchBefore(SELECTED_NODE_REGEX);

			if (!stub || (stub.from === stub.to && !context.explicit)) return null;

			const { quotedNodeName } = match.groups;

			const options = [
				{
					label: `$(${quotedNodeName}).first()`,
					type: 'variable',
					info: 'First output item of this node',
				},
				{
					label: `$(${quotedNodeName}).last()`,
					type: 'variable',
					info: 'Last output item of this node',
				},
				{
					label: `$(${quotedNodeName}).all()`,
					type: 'variable',
					info: 'All output items of this node',
				},
				{
					label: `$(${quotedNodeName}).item(index)`,
					type: 'variable',
					info: 'Specific output item of this node',
				},
			];

			return {
				from: stub.from,
				options,
			};
		},

		/**
		 * $node['nodeName'] -> $node['nodeName'].json
		 */
		accessedNodeCompletions(context: CompletionContext): CompletionResult | null {
			const ACCESSED_NODE_REGEX = /\$node\[(?<quotedNodeName>['"]\w+['"])\]\./;

			const match = context.state.doc.toString().match(ACCESSED_NODE_REGEX);

			if (!match || !match.groups || !match.groups.quotedNodeName) return null;

			const stub = context.matchBefore(ACCESSED_NODE_REGEX);

			if (!stub || (stub.from === stub.to && !context.explicit)) return null;

			const { quotedNodeName } = match.groups;

			const options = [
				{
					label: `$node[${quotedNodeName}].json`,
					type: 'variable',
				},
				{
					label: `$node[${quotedNodeName}].binary`,
					type: 'variable',
				},
				{
					label: `$node[${quotedNodeName}].pairedItem`,
					type: 'variable',
				},
				{
					label: `$node[${quotedNodeName}].runIndex`,
					type: 'variable',
				},
			];

			return {
				from: stub.from,
				options,
			};
		},

		/**
		 * $nodeItem -> $nodeItem.json
		 */
		$nodeItemCompletions(context: CompletionContext): CompletionResult | null {
			const stub = context.matchBefore(/\$nodeItem\./);

			if (!stub || (stub.from === stub.to && !context.explicit)) return null;

			const options = [
				{
					label: '$nodeItem.json',
					type: 'variable',
				},
				{
					label: '$nodeItem.binary',
					type: 'variable',
				},
				{
					label: '$nodeItem.pairedItem',
					type: 'variable',
				},
				{
					label: '$nodeItem.runIndex',
					type: 'variable',
				},
			];

			return {
				from: stub.from,
				options,
			};
		},

		/**
		 * $nodeItems[n]. -> $nodeItems[n].json
		 */
		$nodeItemsCompletions(context: CompletionContext): CompletionResult | null {
			const NODE_ITEMS_REGEX = /\$nodeItems\[(?<index>\w+)\]\./;

			const match = context.state.doc.toString().match(NODE_ITEMS_REGEX);

			if (!match || !match.groups || !match.groups.index) return null;

			const stub = context.matchBefore(NODE_ITEMS_REGEX);

			if (!stub || (stub.from === stub.to && !context.explicit)) return null;

			const { index } = match.groups;

			const options = [
				{
					label: `$nodeItems[${index}].json`,
					type: 'variable',
				},
				{
					label: `$nodeItems[${index}].binary`,
					type: 'variable',
				},
				{
					label: `$nodeItems[${index}].pairedItem`,
					type: 'variable',
				},
				{
					label: `$nodeItems[${index}].runIndex`,
					type: 'variable',
				},
			];

			return {
				from: stub.from,
				options,
			};
		},

		jsSnippets() {
			return completeFromList([
				...nativeJsSnippets.filter((snippet) => snippet.label !== 'class'),
				snippetCompletion('console.log(${arg})', { label: 'console.log()' }),
				snippetCompletion('DateTime', { label: 'DateTime' }),
				snippetCompletion('Interval', { label: 'Interval' }),
				snippetCompletion('Duration', { label: 'Duration' }),
			]);
		},
	},
});
