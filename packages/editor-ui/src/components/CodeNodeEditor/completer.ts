import Vue from 'vue';

import {
	autocompletion,
	completeFromList,
	Completion,
	CompletionContext,
	CompletionResult,
	snippetCompletion,
} from '@codemirror/autocomplete';
import {
	snippets,
	localCompletionSource,
} from '@codemirror/lang-javascript';
import {
	AUTOCOMPLETABLE_BUILT_IN_MODULES,
	NODE_TYPES_EXCLUDED_FROM_AUTOCOMPLETION,
} from './constants';
import { isAllowedInDotNotation } from '@/utils';

import type { IDataObject, IPinData, IRunData } from 'n8n-workflow';
import type { Extension } from '@codemirror/state';
import type { INodeUi } from '@/Interface';
import type { CodeNodeEditorMixin } from './types';

const toVariableOption = (label: string) => ({ label, type: 'variable' });

const jsSnippets = completeFromList([
	...snippets.filter((snippet) => snippet.label !== 'class'),
	snippetCompletion('console.log(${arg})', { label: 'console.log()' }),
	snippetCompletion('DateTime', { label: 'DateTime' }),
	snippetCompletion('Interval', { label: 'Interval' }),
	snippetCompletion('Duration', { label: 'Duration' }),
]);

export const completerExtension = (Vue as CodeNodeEditorMixin).extend({
	computed: {
		autocompletableNodeNames(): string[] {
			return this.$store.getters.allNodes
				.filter((node: INodeUi) => !NODE_TYPES_EXCLUDED_FROM_AUTOCOMPLETION.includes(node.type))
				.map((node: INodeUi) => node.name);
		},
	},
	methods: {
		autocompletionExtension(): Extension {
			return autocompletion({
				compareCompletions: (a: Completion, b: Completion) => {
					if (/\.json$|id$|id['"]\]$/.test(a.label)) return 0;

					return a.label.localeCompare(b.label);
				},
				override: [
					jsSnippets,
					localCompletionSource,
					this.globalCompletions,
					this.nodeSelectorCompletions,
					this.selectedNodeCompletions,
					this.selectedNodeMethodCompletions,
					this.$executionCompletions,
					this.$workflowCompletions,
					this.$prevNodeCompletions,
					this.requireCompletions,
					this.$inputCompletions,
					this.$inputMethodCompletions,
					this.nodeSelectorJsonFieldCompletions,
					this.$inputJsonFieldCompletions,
				],
			});
		},

		/**
		 * $ 		-> 		$execution $input $prevNode
		 * 						$workflow $now $today $jmespath
		 * 						$('nodeName')
		 * $ 		-> 		$json $binary $itemIndex 					<runOnceForEachItem>
		 */
		globalCompletions(context: CompletionContext): CompletionResult | null {
			const preCursor = context.matchBefore(/\$\w*/);

			if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) return null;

			const GLOBAL_VARS_IN_ALL_MODES: Completion[] = [
				{ label: '$execution' },
				{ label: '$input' },
				{ label: '$prevNode' },
				{ label: '$workflow' },
				{ label: '$now' },
				{ label: '$today' },
				{ label: '$jmespath()', info: '(jsObject: object, path: string)' },
			];

			const options: Completion[] = GLOBAL_VARS_IN_ALL_MODES.map(
				({ label, info }) => ({ label, type: 'variable', info }),
			);

			options.push(...this.autocompletableNodeNames.map((name) => {
				return {
					label: `$('${name}')`,
					type: 'variable',
				};
			}));

			if (this.mode === 'runOnceForEachItem') {
				const GLOBAL_VARS_IN_EACH_ITEM_MODE = [
					'$json',
					'$binary',
					'$itemIndex',
				];

				options.push(
					...GLOBAL_VARS_IN_EACH_ITEM_MODE.map(toVariableOption),
				);
			}

			return {
				from: preCursor.from,
				options,
			};
		},

		/**
		 * $( 		->		$('nodeName')
		 */
		nodeSelectorCompletions(context: CompletionContext): CompletionResult | null {
			const preCursor = context.matchBefore(/\$\(.*/);

			if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) return null;

			const options = this.autocompletableNodeNames.map((name) => {
				return {
					label: `$('${name}')`,
					type: 'variable',
				};
			});

			return {
				from: preCursor.from,
				options,
			};
		},

		/**
		 * $('nodeName'). 	->		.first() .last() .all()
		 * 												.params .context
		 * $('nodeName'). 	-> 		.itemMatching()							<runOnceForAllItems>
		 * $('nodeName'). 	->		.item												<runOnceForEachItem>
		 */
		selectedNodeCompletions(context: CompletionContext): CompletionResult | null {
			const pattern = /\$\((?<quotedNodeName>['"][\w\s]+['"])\)\..*/;

			const preCursor = context.matchBefore(pattern);

			if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) return null;

			const match = preCursor.text.match(pattern);

			if (!match || !match.groups || !match.groups.quotedNodeName) return null;

			const { quotedNodeName } = match.groups;

			const options: Completion[] = [
				{
					label: `$(${quotedNodeName}).first()`,
					type: 'function',
				},
				{
					label: `$(${quotedNodeName}).last()`,
					type: 'function',
				},
				{
					label: `$(${quotedNodeName}).all()`,
					type: 'function',
				},
				{
					label: `$(${quotedNodeName}).params`,
					type: 'variable',
				},
				{
					label: `$(${quotedNodeName}).context`,
					type: 'variable',
				},
			];

			if (this.mode === 'runOnceForAllItems') {
				options.push({
					label: `$(${quotedNodeName}).itemMatching()`,
					type: 'function',
				});
			}

			if (this.mode === 'runOnceForEachItem') {
				options.push({
					label: `$(${quotedNodeName}).item`,
					type: 'variable',
				});
			}

			return {
				from: preCursor.from,
				options,
			};
		},

		/**
		 * $('nodeName').first(). 			->		.json .binary
		 * $('nodeName').last().				->		.json .binary
		 * $('nodeName').item. 		 			-> 		.json .binary 	<runOnceForEachItem>
		 * $('nodeName').all()[index].	->		.json .binary
		 */
		selectedNodeMethodCompletions(context: CompletionContext): CompletionResult | null {
			const patterns = {
				firstOrLast: 	/\$\((?<quotedNodeName>['"][\w\s]+['"])\)\.(?<method>(first|last))\(\)\..*/,
				item: 				/\$\((?<quotedNodeName>['"][\w\s]+['"])\)\.item\..*/,
				all: 					/\$\((?<quotedNodeName>['"][\w\s]+['"])\)\.all\(\)\[(?<index>\w+)\]\..*/,
			};

			for (const [name, regex] of Object.entries(patterns)) {
				const preCursor = context.matchBefore(regex);

				if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) continue;

				const match = preCursor.text.match(regex);

				if (!match || !match.groups) continue;

				if (name === 'firstOrLast' && match.groups.quotedNodeName && match.groups.method) {
					const { quotedNodeName, method } = match.groups;

					const labels = [
						`$(${quotedNodeName}).${method}().json`,
						`$(${quotedNodeName}).${method}().binary`,
					];

					return {
						from: preCursor.from,
						options: labels.map(toVariableOption),
					};
				}

				if (name === 'item' && this.mode === 'runOnceForEachItem' && match.groups.quotedNodeName) {
					const { quotedNodeName } = match.groups;

					const labels = [
						`$(${quotedNodeName}).item.json`,
						`$(${quotedNodeName}).item.binary`,
					];

					return {
						from: preCursor.from,
						options: labels.map(toVariableOption),
					};
				}

				if (name === 'all' &&	match.groups.quotedNodeName && match.groups.index) {
					const { quotedNodeName, index } = match.groups;

					const labels = [
						`$(${quotedNodeName}).all()[${index}].json`,
						`$(${quotedNodeName}).all()[${index}].binary`,
					];

					return {
						from: preCursor.from,
						options: labels.map(toVariableOption),
					};
				}
			}

			return null;
		},

		/**
		 * $execution. 		->		.id .mode .resumeUrl
		 */
		$executionCompletions(context: CompletionContext): CompletionResult | null {
			const preCursor = context.matchBefore(/\$execution\..*/);

			if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) return null;

			const labels = [
				'$execution.id',
				'$execution.mode',
				'$execution.resumeUrl',
			];

			return {
				from: preCursor.from,
				options: labels.map(toVariableOption),
			};
		},

		/**
		 * $workflow.		->		.id .name .active
		 */
		$workflowCompletions(context: CompletionContext): CompletionResult | null {
			const preCursor = context.matchBefore(/\$workflow\..*/);

			if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) return null;

			const labels = [
				'$workflow.id',
				'$workflow.name',
				'$workflow.active',
			];

			return {
				from: preCursor.from,
				options: labels.map(toVariableOption),
			};
		},

		/**
		 * $prevNode.		->		.name .outputIndex .runIndex
		 */
		 $prevNodeCompletions(context: CompletionContext): CompletionResult | null {
			const preCursor = context.matchBefore(/\$prevNode\..*/);

			if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) return null;

			const labels = [
				'$prevNode.name',
				'$prevNode.outputIndex',
				'$prevNode.runIndex',
			];

			return {
				from: preCursor.from,
				options: labels.map(toVariableOption),
			};
		},

		/**
		 * req		->		require('moduleName')
		 */
		 requireCompletions(context: CompletionContext): CompletionResult | null {
			const preCursor = context.matchBefore(/req.*/);

			if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) return null;

			const options: Completion[] = [];

			const allowedModules = this.$store.getters['settings/allowedModules'];

			const toOption = (moduleName: string) => ({
				label: `require('${moduleName}');`,
				type: 'variable',
			});

			if (allowedModules.builtIn.includes('*')) {
				options.push(...AUTOCOMPLETABLE_BUILT_IN_MODULES.map(toOption));
			} else if (allowedModules.builtIn.length > 0) {
				options.push(...allowedModules.builtIn.map(toOption));
			}

			if (allowedModules.external.length > 0) {
				options.push(...allowedModules.external.map(toOption));
			}

			return {
				from: preCursor.from,
				options,
			};
		},

		/**
		 * $input.		->		.first() .last() .all()
		 * $input.		->		.item												<runOnceForEachItem>
		 */
		$inputCompletions(context: CompletionContext): CompletionResult | null {
			const preCursor = context.matchBefore(/\$input\..*/);

			if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) return null;

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
			];

			if (this.mode === 'runOnceForEachItem') {
				options.push({
					label: '$input.item',
					type: 'variable',
				});
			}

			return {
				from: preCursor.from,
				options,
			};
		},

		/**
		 * $input.first(). 				->		.json .binary
		 * $input.last().					->		.json .binary
		 * $input.item. 		 			-> 		.json .binary		<runOnceForEachItem>
		 * $input.all()[index].		->		.json .binary
		 */
		$inputMethodCompletions(context: CompletionContext): CompletionResult | null {
			const patterns = {
				firstOrLast: 	/\$input\.(?<method>(first|last))\(\)\..*/,
				item: 				/\$input\.item\..*/,
				all: 					/\$input\.all\(\)\[(?<index>\w+)\]\..*/,
			};

			for (const [name, regex] of Object.entries(patterns)) {
				const preCursor = context.matchBefore(regex);

				if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) continue;

				const match = preCursor.text.match(regex);

				if (!match) continue;

				if (name === 'firstOrLast' && match.groups && match.groups.method) {
					const { method } = match.groups;

					const labels = [
						`$input.${method}().json`,
						`$input.${method}().binary`,
					];

					return {
						from: preCursor.from,
						options: labels.map(toVariableOption),
					};
				}

				if (name === 'item' && this.mode === 'runOnceForEachItem') {
					const labels = [
						'$input.item.json',
						'$input.item.binary',
					];

					return {
						from: preCursor.from,
						options: labels.map(toVariableOption),
					};
				}

				if (name === 'all' &&	match.groups && match.groups.index) {
					const { index } = match.groups;

					const labels = [
						`$input.all()[${index}].json`,
						`$input.all()[${index}].binary`,
					];

					return {
						from: preCursor.from,
						options: labels.map(toVariableOption),
					};
				}
			}

			return null;
		},

		/**
		 * $('nodeName').first().json[ 				-> 		['field']
		 * $('nodeName').last().json[ 				-> 		['field']
		 * $('nodeName').item.json[ 					-> 		['field']		<runOnceForEachItem>
		 * $('nodeName').all()[index].json[ 	-> 		['field']
		 *
		 * Including dot notation variants, e.g.:
		 *
		 * $('nodeName').first().json. 				->		.field
		 */
		nodeSelectorJsonFieldCompletions(context: CompletionContext): CompletionResult | null {
			const patterns = {
				firstOrLast:	/\$\((?<quotedNodeName>['"][\w\s]+['"])\)\.(?<method>(first|last))\(\)\.json(\[|\.).*/,
				item: 				/\$\((?<quotedNodeName>['"][\w\s]+['"])\)\.item\.json(\[|\.).*/,
				all: 					/\$\((?<quotedNodeName>['"][\w\s]+['"])\)\.all\(\)\[(?<index>\w+)\]\.json(\[|\.).*/,
			};

			for (const [name, regex] of Object.entries(patterns)) {
				const preCursor = context.matchBefore(regex);

				if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) continue;

				const match = preCursor.text.match(regex);

				if (!match || !match.groups) continue;

				if (name === 'firstOrLast' && match.groups.quotedNodeName && match.groups.method) {
					const { quotedNodeName, method } = match.groups;

					return this.makeJsonFieldCompletions(
						preCursor,
						this.getJsonOutput(quotedNodeName),
						`$(${quotedNodeName}).${method}().json`,
					);
				}

				if (name === 'item' && this.mode === 'runOnceForEachItem' && match.groups.quotedNodeName) {
					const { quotedNodeName } = match.groups;

					return this.makeJsonFieldCompletions(
						preCursor,
						this.getJsonOutput(quotedNodeName),
						`$(${quotedNodeName}).item.json`,
					);
				}

				if (name === 'all' && match.groups.quotedNodeName && match.groups.index) {
					const { quotedNodeName, index } = match.groups;

					return this.makeJsonFieldCompletions(
						preCursor,
						this.getJsonOutput(quotedNodeName),
						`$(${quotedNodeName}).all()[${index}].json`,
					);
				}
			}

			return null;
		},

		/**
		 * $input.first().json[ 					-> 		['field']
		 * $input.last().json[ 						-> 		['field']
		 * $input.item.json[ 							-> 		['field']		<runOnceForEachItem>
		 * $input.all()[index].json[ 			-> 		['field']
		 *
		 * Including dot notation variants, e.g.:
		 *
		 * $input.first().json. 					->		.field
		 */
		$inputJsonFieldCompletions(context: CompletionContext): CompletionResult | null {
			const patterns = {
				firstOrLast: 	/\$input\.(?<method>(first|last))\(\)\.json(\[|\.).*/,
				item: 				/\$input\.item\.json(\[|\.).*/,
				all: 					/\$input\.all\(\)\[(?<index>\w+)\]\.json(\[|\.).*/,
			};

			for (const [name, regex] of Object.entries(patterns)) {
				const preCursor = context.matchBefore(regex);

				if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) continue;

				const match = preCursor.text.match(regex);

				if (!match) continue;

				if (name === 'firstOrLast' && match.groups && match.groups.method) {
					const { method } = match.groups;

					const inputNodeName = this.getInputNodeName();

					return this.makeJsonFieldCompletions(
						preCursor,
						this.getJsonOutput(inputNodeName),
						`$input.${method}().json`,
					);
				}

				if (name === 'item' && this.mode === 'runOnceForEachItem') {
					const inputNodeName = this.getInputNodeName();

					return this.makeJsonFieldCompletions(
						preCursor,
						this.getJsonOutput(inputNodeName),
						'$input.item.json',
					);
				}

				if (name === 'all' && match.groups && match.groups.index) {
					const { index } = match.groups;

					const inputNodeName = this.getInputNodeName();

					return this.makeJsonFieldCompletions(
						preCursor,
						this.getJsonOutput(inputNodeName),
						`$input.all()[${index}].json`,
					);
				}
			}

			return null;
		},

		// ----------------------------------
		//            helpers
		// ----------------------------------

		/**
		 * Make completions for:
		 *
		 * - .json -> .json['field']
		 * - .json -> .json.field
		 */
		makeJsonFieldCompletions(
			preCursor: NonNullable<ReturnType<CompletionContext['matchBefore']>>,
			jsonOutput: IDataObject | null,
			baseReplacement: `${string}.json`, // e.g. $input.first().json
		) {
			if (!jsonOutput) return null;

			if (preCursor.text.endsWith('.json[')) {
				const options = Object.keys(jsonOutput)
					.map((field) => `${baseReplacement}['${field}']`)
					.map(toVariableOption);

				return {
					from: preCursor.from,
					options,
				};
			}

			if (preCursor.text.endsWith('.json.')) {
				const options = Object.keys(jsonOutput)
					.filter(isAllowedInDotNotation)
					.map(field => `${baseReplacement}.${field}`)
					.map(toVariableOption);

				return {
					from: preCursor.from,
					options,
				};
			}

			return null;
		},

		/**
		 * Retrieve the `json` output of a node from `runData` or `pinData`.
		 */
		getJsonOutput(quotedNodeName: string) {
			const runData: IRunData | null = this.$store.getters.getWorkflowRunData;

			const nodeName = quotedNodeName.replace(/['"]/g, '');

			const nodeRunData = runData && runData[nodeName];

			if (nodeRunData) {
				try {
					// @TODO: Figure out [0] ... [0][0] - itemIndex, runIndex, outputIndex - order?
					// nodeRunData[0] -> ITaskData
					// data.main[0] -> Array<INodeExecutionData[] | null>
					// final [0] -> INodeExecutionData -> run (execution per input bundle)
					return nodeRunData[0].data!.main[0]![0].json;
				} catch (_) {
					return null;
				}
			}

			const pinData: IPinData | undefined = this.$store.getters.pinData;

			const nodePinData = pinData && pinData[nodeName];

			if (!nodePinData) return null;

			try {
				return nodePinData[0].json; // always zeroth runIndex, see WorfklowExecute.ts
			} catch (_) {
				return null;
			}
		},

		/**
		 * Retrieve the name of the node that feeds into the active node.
		 */
		getInputNodeName() {
			const workflow = this.getCurrentWorkflow();

			const input = workflow.connectionsByDestinationNode[this.activeNode.name];

			// @TODO: Account for multiple input nodes

			// @TODO: Figure out [0][0] - itemIndex, runIndex, outputIndex - which two? order?
			// data.main[0] -> Array<INodeExecutionData[] | null>
			// final [0] -> INodeExecutionData
			return input.main[0][0].node;
		},
	},
});
