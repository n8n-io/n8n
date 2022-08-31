import Vue from 'vue';

import {
	autocompletion,
	completeFromList,
	Completion,
	CompletionContext,
	CompletionResult,
	snippetCompletion,
} from '@codemirror/autocomplete';
import { snippets as nativeJsSnippets } from '@codemirror/lang-javascript';

import type { IRunData } from 'n8n-workflow';
import type { Extension } from '@codemirror/state';
import type { INodeUi } from '@/Interface';
import type { CodeNodeEditorMixin } from './types';

const GLOBAL_FUNCTIONS: Completion[] = [
	{ label: '$evaluateExpression()', info: 'expression: string, itemIndex?: number' },
	{ label: '$getNodeParameter()', info: 'paramName: string, itemIndex: number' },
	{ label: '$getWorkflowStaticData()', info: "type: 'global' | 'node'" },
	{ label: '$item()', info: 'itemIndex: number, runIndex?: number' },
	{ label: '$items()', info: 'nodeName?: string, outputIndex?: number, runIndex?: number' },
	{ label: '$jmespath()', info: 'jsObject: object, path: string' },
];

const GLOBAL_VARS: Completion[] = [
	{ label: '$env', info: 'Environment variables' },
	{ label: '$executionId', info: 'ID of the current execution' },
	{ label: '$input', info: 'Bundle of input items to this node' },
	{ label: '$mode', info: 'Workflow execution mode' },
	{ label: '$node', info: 'Item from a node - first output, last run' },
	{ label: '$nodeItems', info: 'All items received by this node' },
	{ label: '$now', info: 'Current date and time' },
	{ label: '$parameter', info: 'Parameters of current node' },
	{ label: '$resumeWebhookUrl', info: 'Webhook URL to call to resume a waiting workflow' },
	{ label: '$runIndex', info: 'Index of the current run' },
	{ label: '$today', info: 'Current date' },
	{ label: '$workflow', info: 'Workflow metadata' },
];

const GLOBAL_ITEMS_VARS: Completion[] = [
	{ label: '$nodeItems', info: 'All items received by this node' },
];

const GLOBAL_ITEM_VARS: Completion[] = [
	{ label: '$binary', info: "Data in item's `binary` key" },
	{ label: '$json', info: "Data in item's `json` key" },
	{ label: '$nodeItem', info: 'Each item received by this node' },
	{ label: '$position', info: 'Index of the item in array' },
];

const NODE_TYPES_EXCLUDED_FROM_AUTOCOMPLETION = ['n8n-nodes-base.stickyNote'];

const isAutocompletable = (node: INodeUi) =>
	!NODE_TYPES_EXCLUDED_FROM_AUTOCOMPLETION.includes(node.type);

export const autocompleterExtension = (Vue as CodeNodeEditorMixin).extend({
	computed: {
		autocompletableNodeNames(): string[] {
			return this.$store.getters.allNodes
				.filter(isAutocompletable)
				.map((node: INodeUi) => node.name);
		},
	},
	methods: {
		autocompletionExtension(): Extension {
			return autocompletion({
				override: [
					this.globalCompletions, // 											$
					this.nodeSelectorCompletions, // 								$(

					this.nodeAccessorCompletions, // 								$node[
					this.selectedNodeCompletions, // 								$(nodeName).
					this.accessedNodeCompletions, // 								$node['nodeName'].

					this.$nodeItemCompletions, // 									$nodeItem.
					this.$nodeItemsCompletions, // 									$nodeItems.

					this.$inputCompletions, // 											$input.
					this.$inputMethodCompletions, // 								$input.method().

					this.$itemsCallCompletions, // 									$items(
					this.$itemsCallWithIndexCompletions, // 				$items('nodeName')[index].
					this.$itemCallWithIndexCompletions, // 					$item(index).
					this.$itemCallWithIndexAndNodeCompletions, //		$item(index).$node['nodeName'].

					this.jsonFieldCompletions, //										.json[

					this.jsSnippets(),
				],
			});
		},

		// @TODO: Go back one char after global function autocompletion (arg position)
		// @TODO: Disable closing brace matching during autocompletion
		// @TODO: Check if pairedItem()
		// @TODO: Boost .json over .binary
		// @TODO: Completions for nested .json values

		/**
		 * 	$ 																-> 		$global
		 *	$ <runOnceForEachItem> 						->		<all of $global plus> $binary $json $nodeItem $position
		 *	$ <runOnceForAllItems> 						->		<all of $global plus> $nodeItems

		 * 	$( 																->		$('nodeName')
		 * 	$node[ 														-> 		$node['nodeName']
		 * 	$('nodeName'). 										-> 		.first(), .last(), all(), .item()
		 * 	$node['nodeName']. 								-> 		.json .binary .pairedItem .runIndex

		 * 	$nodeItem. 												-> 		.json .binary .pairedItem .runIndex
		 * 	$nodeItems[index]. 								-> 		.json .binary .pairedItem .runIndex

		 * 	$input. 													-> 		.first() .last() .all() .item(index)
		 * 	$input.first(). 									-> 		.json .binary .pairedItem .runIndex
		 * 	$input.last(). 										-> 		.json .binary .pairedItem .runIndex
		 * 	$input.all()[index].							-> 		.json .binary .pairedItem .runIndex
		 * 	$input.item(index). 							-> 		.json .binary .pairedItem .runIndex

		 * 	$items( 													-> 		$items('nodeName')
		 * 	$items('nodeName')[index].				-> 		.json .binary .pairedItem .runIndex
		 * 	$item(index). 										->		.$node[
		 * 	$item(index).$node[ 							-> 		$item(index).$node['nodeName']
		 * 	$item(index).$node['nodeName']. 	-> 		.json .binary .pairedItem .runIndex

		 * 	.json[ -> .json['jsonField'] @TODO
		 */

		// -----------------------------------------
		//     json fields for arbitrary refs
		// -----------------------------------------

		/**
		 * First 		$('nodeName').first().json[ 						-> 		.json['jsonField'] @TODO
		 *  				$('nodeName').last().json[ 							-> 		.json['jsonField'] @TODO
		 *  				$('nodeName').item(index).json[ 				-> 		.json['jsonField'] @TODO
		 *  				$('nodeName').all()[index].json[ 				-> 		.json['jsonField'] @TODO
		 * Second		$node['nodeName'].json[ 								-> 		.json['jsonField']
		 * Third		$item(index).$node['nodeName'].json[ 		-> 		.json['jsonField']
		 * Fourth		$items()[index].json[ 									-> 		.json['jsonField'] @TODO
		 * Fifth		$items('nodeName')[index].json[ 				-> 		.json['jsonField'] @TODO
		 */

		// -----------------------------------------
		//      json fields for incoming refs
		// -----------------------------------------

		/**
		 * $input.first().json[ 				->			.json['jsonField'] @TODO
		 * $input.last().json[					->			.json['jsonField'] @TODO
		 * $input.all()[index].json[		->			.json['jsonField'] @TODO
		 * $input.item(index).json[ 		->			.json['jsonField'] @TODO
		 * $nodeItem.json[							->			.json['jsonField'] @TODO
		 * $nodeItems[index].json[			->			.json['jsonField'] @TODO
		 */

		// workflow.connectionsByDestinationNode['nodeName']
		// this.$store.getters.allConnections;

		/**
		 * $ -> $global
		 */
		globalCompletions(context: CompletionContext): CompletionResult | null {
			const stub = context.matchBefore(/\$\w*/);

			if (!stub || (stub.from === stub.to && !context.explicit)) return null;

			const options: Completion[] = [
				...GLOBAL_FUNCTIONS.map(({ label, info }) => ({ label, type: 'function', info })),
				...GLOBAL_VARS.map(({ label, info }) => ({ label, type: 'variable', info })),
			];

			if (this.mode === 'runOnceForEachItem') {
				options.push(
					...GLOBAL_ITEM_VARS.map(({ label, info }) => ({ label, type: 'variable', info })),
				);
			} else if (this.mode === 'runOnceForAllItems') {
				options.push(
					...GLOBAL_ITEMS_VARS.map(({ label, info }) => ({ label, type: 'variable', info })),
				);
			}

			return {
				from: stub.from,
				options,
			};
		},

		/**
		 * $( -> $('nodeName')
		 */
		nodeSelectorCompletions(context: CompletionContext): CompletionResult | null {
			const stub = context.matchBefore(/\$\(.*/);

			if (!stub || (stub.from === stub.to && !context.explicit)) return null;

			const options: Completion[] = this.autocompletableNodeNames.map((name) => {
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

			const options: Completion[] = this.autocompletableNodeNames.map((name) => {
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
		 * $('nodeName'). -> .first() .last() .all() .item()
		 */
		selectedNodeCompletions(context: CompletionContext): CompletionResult | null {
			const SELECTED_NODE = /\$\((?<quotedNodeName>['"][\w\s]+['"])\)\./;

			const match = context.state.doc.toString().match(SELECTED_NODE);

			if (!match || !match.groups || !match.groups.quotedNodeName) return null;

			const stub = context.matchBefore(SELECTED_NODE);

			if (!stub || (stub.from === stub.to && !context.explicit)) return null;

			const { quotedNodeName } = match.groups;

			const options: Completion[] = [
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
					label: `$(${quotedNodeName}).item()`,
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
		 * $node['nodeName']. -> .json .binary .pairedItem .runIndex
		 */
		accessedNodeCompletions(context: CompletionContext): CompletionResult | null {
			const ACCESSED_NODE = /\$node\[(?<quotedNodeName>['"][\w\s]+['"])\]\./;

			const match = context.state.doc.toString().match(ACCESSED_NODE);

			if (!match || !match.groups || !match.groups.quotedNodeName) return null;

			const stub = context.matchBefore(ACCESSED_NODE);

			if (!stub || (stub.from === stub.to && !context.explicit)) return null;

			const { quotedNodeName } = match.groups;

			const options: Completion[] = [
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
		 * $nodeItem. -> .json .binary .pairedItem .runIndex
		 */
		$nodeItemCompletions(context: CompletionContext): CompletionResult | null {
			const stub = context.matchBefore(/\$nodeItem\./);

			if (!stub || (stub.from === stub.to && !context.explicit)) return null;

			const options: Completion[] = [
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
		 * $input. -> .first() .last() .all() .item()
		 */
		$inputCompletions(context: CompletionContext): CompletionResult | null {
			const stub = context.matchBefore(/\$input\./);

			if (!stub || (stub.from === stub.to && !context.explicit)) return null;

			const options: Completion[] = [
				{
					label: '$input.first()',
					type: 'function',
				},
				{
					label: '$input.last()',
					type: 'function',
				},
				{
					label: '$input.all()',
					type: 'function',
				},
				{
					label: '$input.item()',
					type: 'function',
				},
			];

			return {
				from: stub.from,
				options,
			};
		},

		/**
		 * $input.first(). -> .json .binary .pairedItem .runIndex
		 * $input.last(). -> .json .binary .pairedItem .runIndex
		 * $input.item(index). -> .json .binary .pairedItem .runIndex
		 * $input.all()[index]. -> .json .binary .pairedItem .runIndex
		 */
		$inputMethodCompletions(context: CompletionContext): CompletionResult | null {
			const INPUT_FIRST_OR_LAST_CALL = /\$input\.(?<method>(first|last))\(\)\./;

			const firstLastMatch = context.state.doc.toString().match(INPUT_FIRST_OR_LAST_CALL);

			if (firstLastMatch && firstLastMatch.groups && firstLastMatch.groups.method) {
				const stub = context.matchBefore(INPUT_FIRST_OR_LAST_CALL);

				if (!stub || (stub.from === stub.to && !context.explicit)) return null;

				const { method } = firstLastMatch.groups;

				const options: Completion[] = [
					{
						label: `$input.${method}().json`,
						type: 'variable',
					},
					{
						label: `$input.${method}().binary`,
						type: 'variable',
					},
					{
						label: `$input.${method}().pairedItem`,
						type: 'variable',
					},
					{
						label: `$input.${method}().runIndex`,
						type: 'variable',
					},
				];

				return {
					from: stub.from,
					options,
				};
			}

			const INPUT_ITEM_CALL = /\$input\.item\((?<index>\w+)\)\./;

			const itemMatch = context.state.doc.toString().match(INPUT_ITEM_CALL);

			if (itemMatch && itemMatch.groups && itemMatch.groups.index) {
				const stub = context.matchBefore(INPUT_ITEM_CALL);

				if (!stub || (stub.from === stub.to && !context.explicit)) return null;

				const { index } = itemMatch.groups;

				const options: Completion[] = [
					{
						label: `$input.item(${index}).json`,
						type: 'variable',
					},
					{
						label: `$input.item(${index}).binary`,
						type: 'variable',
					},
					{
						label: `$input.item(${index}).pairedItem`,
						type: 'variable',
					},
					{
						label: `$input.item(${index}).runIndedx`,
						type: 'variable',
					},
				];

				return {
					from: stub.from,
					options,
				};
			}

			const INPUT_ALL_CALL = /\$input\.all\(\)\[(?<index>\w+)\]\./;

			const allMatch = context.state.doc.toString().match(INPUT_ALL_CALL);

			if (allMatch && allMatch.groups && allMatch.groups.index) {
				const stub = context.matchBefore(INPUT_ALL_CALL);

				if (!stub || (stub.from === stub.to && !context.explicit)) return null;

				const { index } = allMatch.groups;

				const options: Completion[] = [
					{
						label: `$input.all()[${index}].json`,
						type: 'variable',
					},
					{
						label: `$input.all()[${index}].binary`,
						type: 'variable',
					},
					{
						label: `$input.all()[${index}].pairedItem`,
						type: 'variable',
					},
					{
						label: `$input.all()[${index}].runIndedx`,
						type: 'variable',
					},
				];

				return {
					from: stub.from,
					options,
				};
			}

			return null;
		},

		/**
		 * $items( -> $items('nodeName')
		 */
		$itemsCallCompletions(context: CompletionContext): CompletionResult | null {
			const stub = context.matchBefore(/\$items\(.*/);

			if (!stub || (stub.from === stub.to && !context.explicit)) return null;

			const options: Completion[] = this.autocompletableNodeNames.map((name) => {
				return {
					label: `$items('${name}')`,
					type: 'variable',
				};
			});

			return {
				from: stub.from,
				options,
			};
		},

		/**
		 * $items('nodeName')[index]. -> .json .binary .pairedItem .runIndex
		 */
		$itemsCallWithIndexCompletions(context: CompletionContext): CompletionResult | null {
			const ITEMS_CALL_WITH_INDEX =
				/\$items\((?<quotedNodeName>['"][\w\s]+['"])\)\[(?<index>\w+)\]\./;

			const itemsMatch = context.state.doc.toString().match(ITEMS_CALL_WITH_INDEX);

			if (
				!itemsMatch ||
				!itemsMatch.groups ||
				!itemsMatch.groups.quotedNodeName ||
				!itemsMatch.groups.index
			)
				return null;

			const stub = context.matchBefore(ITEMS_CALL_WITH_INDEX);

			if (!stub || (stub.from === stub.to && !context.explicit)) return null;

			const { quotedNodeName, index } = itemsMatch.groups;

			const options: Completion[] = [
				{
					label: `$items(${quotedNodeName})[${index}].json`,
					type: 'variable',
				},
				{
					label: `$items(${quotedNodeName})[${index}].binary`,
					type: 'variable',
				},
				{
					label: `$items(${quotedNodeName})[${index}].pairedItem`,
					type: 'variable',
				},
				{
					label: `$items(${quotedNodeName})[${index}].runIndex`,
					type: 'variable',
				},
			];

			return {
				from: stub.from,
				options,
			};
		},

		/**
		 * $item(index). -> .$node[
		 */
		$itemCallWithIndexCompletions(context: CompletionContext): CompletionResult | null {
			const ITEM_CALL_WITH_INDEX = /\$item\((?<index>\w+)\)\./;

			const match = context.state.doc.toString().match(ITEM_CALL_WITH_INDEX);

			if (!match || !match.groups || !match.groups.index) return null;

			const stub = context.matchBefore(ITEM_CALL_WITH_INDEX);

			if (!stub || (stub.from === stub.to && !context.explicit)) return null;

			const { index } = match.groups;

			const options: Completion[] = [
				{
					label: `$item(${index}).$node[`,
					type: 'variable',
				},
			];

			return {
				from: stub.from,
				options,
			};

			return null;
		},

		/**
		 * $item(index).$node[ -> $item(index).$node['nodeName']
		 * $item(index).$node['nodeName']. -> .json .binary .pairedItem .runIndex
		 */
		$itemCallWithIndexAndNodeCompletions(context: CompletionContext): CompletionResult | null {
			const ITEM_CALL_WITH_NODE_ACCESSOR = /\$item\((?<index>\w+)\)\.\$node\[/;

			const accessorMatch = context.state.doc.toString().match(ITEM_CALL_WITH_NODE_ACCESSOR);

			if (accessorMatch && accessorMatch.groups && accessorMatch.groups.index) {
				const stub = context.matchBefore(ITEM_CALL_WITH_NODE_ACCESSOR);

				if (!stub || (stub.from === stub.to && !context.explicit)) return null;

				const { index } = accessorMatch.groups;

				const options: Completion[] = this.autocompletableNodeNames.map((name) => {
					return {
						label: `$item(${index}).$node['${name}']`,
						type: 'variable',
					};
				});

				return {
					from: stub.from,
					options,
				};
			}

			const ITEM_CALL_WITH_ACCESSED_NODE =
				/\$item\((?<index>\w+)\)\.\$node\[(?<quotedNodeName>['"][\w\s]+['"])\]\./;

			const accessedMatch = context.state.doc.toString().match(ITEM_CALL_WITH_ACCESSED_NODE);

			if (
				accessedMatch &&
				accessedMatch.groups &&
				accessedMatch.groups.index &&
				accessedMatch.groups.quotedNodeName
			) {
				const stub = context.matchBefore(ITEM_CALL_WITH_ACCESSED_NODE);

				if (!stub || (stub.from === stub.to && !context.explicit)) return null;

				const { index, quotedNodeName } = accessedMatch.groups;

				const options: Completion[] = [
					{
						label: `$item(${index})[${quotedNodeName}].json`,
						type: 'variable',
					},
					{
						label: `$item(${index})[${quotedNodeName}].binary`,
						type: 'variable',
					},
					{
						label: `$item(${index})[${quotedNodeName}].pairedItem`,
						type: 'variable',
					},
					{
						label: `$item(${index})[${quotedNodeName}].runIndex`,
						type: 'variable',
					},
				];

				return {
					from: stub.from,
					options,
				};
			}

			return null;
		},

		/**
		 * $nodeItems[index]. -> .json
		 */
		$nodeItemsCompletions(context: CompletionContext): CompletionResult | null {
			const NODE_ITEMS_REGEX = /\$nodeItems\[(?<index>\w+)\]\./;

			const match = context.state.doc.toString().match(NODE_ITEMS_REGEX);

			if (!match || !match.groups || !match.groups.index) return null;

			const stub = context.matchBefore(NODE_ITEMS_REGEX);

			if (!stub || (stub.from === stub.to && !context.explicit)) return null;

			const { index } = match.groups;

			const options: Completion[] = [
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

		/**
		 * First 		$('nodeName').first().json[ 						-> 		.json['jsonField'] @TODO
		 *  				$('nodeName').last().json[ 							-> 		.json['jsonField'] @TODO
		 *  				$('nodeName').item(index).json[ 				-> 		.json['jsonField'] @TODO
		 *  				$('nodeName').all()[index].json[ 				-> 		.json['jsonField'] @TODO
		 * Second		$node['nodeName'].json[ 								-> 		.json['jsonField']
		 * Third		$item(index).$node['nodeName'].json[ 		-> 		.json['jsonField']
		 * Fourth		$items()[index].json[ 									-> 		.json['jsonField'] @TODO
		 * Fifth		$items('nodeName')[index].json[ 				-> 		.json['jsonField'] @TODO
		 */
		jsonFieldCompletions(context: CompletionContext): CompletionResult | null {
			const second = this.jsonFieldSecondVariant(context);

			if (second) return second;

			const third = this.jsonFieldThirdVariant(context);

			if (third) return third;

			return null;
		},

		getJsonValue(quotedNodeName: string) {
			const runData: IRunData | null = this.$store.getters.getWorkflowRunData;

			if (!runData) return;

			const key = quotedNodeName.replace(/('|")/g, '');

			try {
				// @ts-ignore
				return runData[key][0].data.main[0][0].json; // @TODO: Set itemIndex, runIndex, outputIndex
			} catch (_) {
				return;
			}
		},

		/**
		 * $node['nodeName'].json[ -> .json['jsonField']
		 */
		jsonFieldSecondVariant(context: CompletionContext): CompletionResult | void {
			const ACCESSED_NODE_PLUS_JSON = /\$node\[(?<quotedNodeName>['"][\w\s]+['"])\]\.json\[/;

			const match = context.state.doc.toString().match(ACCESSED_NODE_PLUS_JSON);

			if (match && match.groups && match.groups.index && match.groups.quotedNodeName) {
				const stub = context.matchBefore(ACCESSED_NODE_PLUS_JSON);

				if (!stub || (stub.from === stub.to && !context.explicit)) return;

				const { quotedNodeName } = match.groups;

				const jsonContent = this.getJsonValue(quotedNodeName);

				if (!jsonContent) return;

				const options = Object.keys(jsonContent).map((field) => {
					return {
						label: `$node[${quotedNodeName}].json['${field}']`,
						type: 'variable',
					};
				});

				return {
					from: stub.from,
					options,
				};
			}
		},

		/**
		 * $item(index).$node['nodeName'].json[ -> .json['jsonField']
		 */
		jsonFieldThirdVariant(context: CompletionContext): CompletionResult | void {
			const ITEM_CALL_WITH_ACCESSED_NODE_PLUS_JSON =
				/\$item\((?<index>\w+)\)\.\$node\[(?<quotedNodeName>['"][\w\s]+['"])\]\.json\[/;

			const match = context.state.doc.toString().match(ITEM_CALL_WITH_ACCESSED_NODE_PLUS_JSON);

			if (match && match.groups && match.groups.index && match.groups.quotedNodeName) {
				const stub = context.matchBefore(ITEM_CALL_WITH_ACCESSED_NODE_PLUS_JSON);

				if (!stub || (stub.from === stub.to && !context.explicit)) return;

				const { index, quotedNodeName } = match.groups;

				const jsonContent = this.getJsonValue(quotedNodeName);

				if (!jsonContent) return;

				const options = Object.keys(jsonContent).map((field) => {
					return {
						label: `$item(${index}).$node[${quotedNodeName}].json['${field}']`,
						type: 'variable',
					};
				});

				return {
					from: stub.from,
					options,
				};
			}
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
