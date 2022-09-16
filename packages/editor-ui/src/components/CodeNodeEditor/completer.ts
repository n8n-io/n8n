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
	snippets as nativeJsSnippets,
	localCompletionSource,
} from '@codemirror/lang-javascript';

import type { IRunData } from 'n8n-workflow';
import type { Extension } from '@codemirror/state';
import type { INodeUi } from '@/Interface';
import type { CodeNodeEditorMixin } from './types';

const NODE_TYPES_EXCLUDED_FROM_AUTOCOMPLETION = ['n8n-nodes-base.stickyNote'];

const isAutocompletable = (node: INodeUi) =>
	!NODE_TYPES_EXCLUDED_FROM_AUTOCOMPLETION.includes(node.type);

export const completerExtension = (Vue as CodeNodeEditorMixin).extend({
	computed: {
		autocompletableNodeNames(): string[] {
			return this.$store.getters.allNodes
				.filter(isAutocompletable)
				.map((node: INodeUi) => node.name);
		},
		createNodeSelectorCompletions(): Completion[] {
			return this.autocompletableNodeNames.map((name) => {
				return {
					label: `$('${name}')`,
					type: 'variable',
				};
			});
		},
	},
	methods: {
		autocompletionExtension(): Extension {
			return autocompletion({
				compareCompletions: (a: Completion, b: Completion) => {
					if (a.label.endsWith('.json') || a.label.endsWith('id')) return 0;

					return a.label.localeCompare(b.label);
				},
				override: [
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
					this.jsonFieldCompletions,
					this.jsSnippets(),
				],
			});
		},

		/**
		 * $ -> $execution $input $prevNode $workflow $now $today $jmespath
		 * $ <eachItem> -> $json $binary $itemIndex
		 */
		globalCompletions(context: CompletionContext): CompletionResult | null {
			const stub = context.matchBefore(/\$\w*/);

			if (!stub || (stub.from === stub.to && !context.explicit)) return null;

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

			options.push(...this.createNodeSelectorCompletions);

			if (this.mode === 'runOnceForEachItem') {
				const GLOBAL_VARS_IN_EACH_ITEM_MODE: Completion[] = [
					{ label: '$json' },
					{ label: '$binary' },
					{ label: '$itemIndex' },
				];

				options.push(
					...GLOBAL_VARS_IN_EACH_ITEM_MODE.map(({ label, info }) => ({ label, type: 'variable', info })),
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

			return {
				from: stub.from,
				options: this.createNodeSelectorCompletions,
			};
		},

		/**
		 * $('nodeName'). -> .first() .last() .all() .params .context
		 * $('nodeName'). <allItems> -> .itemMatching()
		 * $('nodeName'). <eachItem> -> .item
		 */
		selectedNodeCompletions(context: CompletionContext): CompletionResult | null {
			const SELECTED_NODE = /\$\((?<quotedNodeName>['"][\w\s]+['"])\)\..*/;

			const match = context.state.doc.toString().match(SELECTED_NODE);

			if (!match || !match.groups || !match.groups.quotedNodeName) return null;

			const stub = context.matchBefore(SELECTED_NODE);

			if (!stub || (stub.from === stub.to && !context.explicit)) return null;

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
				options.push(				{
					label: `$(${quotedNodeName}).itemMatching()`,
					type: 'function',
				});
			}

			if (this.mode === 'runOnceForEachItem') {
				options.push(				{
					label: `$(${quotedNodeName}).item`,
					type: 'variable',
				});
			}

			return {
				from: stub.from,
				options,
			};
		},

		/**
		 * $('nodeName').first(). -> .json .binary
		 * $('nodeName').last(). -> .json .binary
		 * $('nodeName').all()[index]. -> .json .binary
		 * $('nodeName').item. -> .json .binary
		 */
		selectedNodeMethodCompletions(context: CompletionContext): CompletionResult | null {
			const SELECTED_NODE_WITH_FIRST_OR_LAST_CALL =
				/\$\((?<quotedNodeName>['"][\w\s]+['"])\)\.(?<method>(first|last))\(\)\..*/;

			const firstLastMatch = context.state.doc
				.toString()
				.match(SELECTED_NODE_WITH_FIRST_OR_LAST_CALL);

			if (
				firstLastMatch &&
				firstLastMatch.groups &&
				firstLastMatch.groups.quotedNodeName &&
				firstLastMatch.groups.method
			) {
				const stub = context.matchBefore(SELECTED_NODE_WITH_FIRST_OR_LAST_CALL);

				if (!stub || (stub.from === stub.to && !context.explicit)) return null;

				const { quotedNodeName, method } = firstLastMatch.groups;

				const options: Completion[] = [
					{
						label: `$(${quotedNodeName}).${method}().json`,
						type: 'variable',
					},
					{
						label: `$(${quotedNodeName}).${method}().binary`,
						type: 'variable',
					},
				];

				return {
					from: stub.from,
					options,
				};
			}

			const SELECTED_NODE_WITH_ITEM_CALL =
				/\$\((?<quotedNodeName>['"][\w\s]+['"])\)\.item\..*/;

			const itemMatch = context.state.doc.toString().match(SELECTED_NODE_WITH_ITEM_CALL);

			if (
				itemMatch &&
				itemMatch.groups &&
				itemMatch.groups.quotedNodeName
			) {
				const stub = context.matchBefore(SELECTED_NODE_WITH_ITEM_CALL);

				if (!stub || (stub.from === stub.to && !context.explicit)) return null;

				const { quotedNodeName } = itemMatch.groups;

				const options: Completion[] = [
					{
						label: `$(${quotedNodeName}).item.json`,
						type: 'variable',
					},
					{
						label: `$(${quotedNodeName}).item.binary`,
						type: 'variable',
					},
				];

				return {
					from: stub.from,
					options,
				};
			}

			const SELECTED_NODE_WITH_ALL_CALL =
				/\$\((?<quotedNodeName>['"][\w\s]+['"])\)\.all\(\)\[(?<index>\w+)\]\..*/;

			const allMatch = context.state.doc.toString().match(SELECTED_NODE_WITH_ALL_CALL);

			if (allMatch && allMatch.groups && allMatch.groups.quotedNodeName && allMatch.groups.index) {
				const stub = context.matchBefore(SELECTED_NODE_WITH_ALL_CALL);

				if (!stub || (stub.from === stub.to && !context.explicit)) return null;

				const { quotedNodeName, index } = allMatch.groups;

				const options: Completion[] = [
					{
						label: `$(${quotedNodeName}).all()[${index}].json`,
						type: 'variable',
					},
					{
						label: `$(${quotedNodeName}).all()[${index}].binary`,
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
		 * $execution. -> .id .mode .resumeUrl
		 */
		$executionCompletions(context: CompletionContext): CompletionResult | null {
			const stub = context.matchBefore(/\$execution\..*/);

			if (!stub || (stub.from === stub.to && !context.explicit)) return null;

			const options: Completion[] = [
				{
					label: '$execution.id',
					type: 'variable',
				},
				{
					label: '$execution.mode',
					type: 'variable',
				},
				{
					label: '$execution.resumeUrl',
					type: 'variable',
				},
			];

			return {
				from: stub.from,
				options,
			};
		},

		/**
		 * $workflow. -> .id .name .active
		 */
		$workflowCompletions(context: CompletionContext): CompletionResult | null {
			const stub = context.matchBefore(/\$workflow\..*/);

			if (!stub || (stub.from === stub.to && !context.explicit)) return null;

			const options: Completion[] = [
				{
					label: '$workflow.id',
					type: 'variable',
				},
				{
					label: '$workflow.name',
					type: 'variable',
				},
				{
					label: '$workflow.active',
					type: 'variable',
				},
			];

			return {
				from: stub.from,
				options,
			};
		},

		/**
		 * $prevNode. -> .id .name .active
		 */
		 $prevNodeCompletions(context: CompletionContext): CompletionResult | null {
			const stub = context.matchBefore(/\$prevNode\..*/);

			if (!stub || (stub.from === stub.to && !context.explicit)) return null;

			const options: Completion[] = [
				{
					label: '$prevNode.name',
					type: 'variable',
				},
				{
					label: '$prevNode.outputIndex',
					type: 'variable',
				},
				{
					label: '$prevNode.runIndex',
					type: 'variable',
				},
			];

			return {
				from: stub.from,
				options,
			};
		},

		/**
		 * req -> require('moduleName')
		 */
		 requireCompletions(context: CompletionContext): CompletionResult | null {
			const stub = context.matchBefore(/req.*/);

			if (!stub || (stub.from === stub.to && !context.explicit)) return null;

			const options: Completion[] = [];

			const allowedModules = this.$store.getters['settings/allowedModules'];

			const toRequireOption = (moduleName: string) => ({
				label: `require('${moduleName}')`,
				type: 'variable',
			});

			if (allowedModules.builtIn === '*') {
				const SELECTED_NODE_JS_BUILT_IN_MODULES = [
					'console',
					'constants',
					'crypto',
					'dns',
					'dns/promises',
					'fs',
					'fs/promises',
					'http',
					'http2',
					'https',
					'inspector',
					'module',
					'os',
					'path',
					'process',
					'readline',
					'url',
					'util',
					'zlib',
				];
				options.push(...SELECTED_NODE_JS_BUILT_IN_MODULES.map(toRequireOption));
			} else if (allowedModules.builtIn) {
				options.push(...allowedModules.builtIn.split(',').map(toRequireOption));
			}

			if (allowedModules.external) {
				options.push(...allowedModules.external.split(',').map(toRequireOption));
			}

			return {
				from: stub.from,
				options,
			};
		},

		/**
		 * $input. -> .first() .last() .all()
		 * $input. <eachItem> -> .item
		 */
		$inputCompletions(context: CompletionContext): CompletionResult | null {
			const stub = context.matchBefore(/\$input\..*/);

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

			];

			if (this.mode === 'runOnceForEachItem') {
				options.push({
					label: '$input.item',
					type: 'variable',
				});
			}

			return {
				from: stub.from,
				options,
			};
		},

		/**
		 * $input.first(). -> .json .binary
		 * $input.last(). -> .json .binary
		 * $input.item. -> .json .binary
		 * $input.all()[index]. -> .json .binary
		 */
		$inputMethodCompletions(context: CompletionContext): CompletionResult | null {
			const INPUT_FIRST_OR_LAST_CALL = /\$input\.(?<method>(first|last))\(\)\..*/;

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
				];

				return {
					from: stub.from,
					options,
				};
			}

			const INPUT_ITEM_CALL = /\$input\.item\..*/;

			const itemMatch = context.state.doc.toString().match(INPUT_ITEM_CALL);

			if (itemMatch) {
				const stub = context.matchBefore(INPUT_ITEM_CALL);

				if (!stub || (stub.from === stub.to && !context.explicit)) return null;

				const options: Completion[] = [
					{
						label: '$input.item.json',
						type: 'variable',
					},
					{
						label: '$input.item.binary',
						type: 'variable',
					},
				];

				return {
					from: stub.from,
					options,
				};
			}

			const INPUT_ALL_CALL = /\$input\.all\(\)\[(?<index>\w+)\]\..*/;

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
				];

				return {
					from: stub.from,
					options,
				};
			}

			return null;
		},

		jsonFieldCompletions(context: CompletionContext): CompletionResult | null {
			const nodeSelectorJsonFieldCompletions = this.nodeSelectorJsonFieldCompletions(context);

			if (nodeSelectorJsonFieldCompletions) return nodeSelectorJsonFieldCompletions;

			const $inputJsonFieldCompletions = this.$inputJsonFieldCompletions(context);

			if ($inputJsonFieldCompletions) return $inputJsonFieldCompletions;

			return null;
		},

		getJsonValue(quotedNodeName: string) {
			const runData: IRunData | null = this.$store.getters.getWorkflowRunData;

			if (!runData) return;

			const key = quotedNodeName.replace(/('|")/g, '');

			try {
				// @ts-ignore
				return runData[key][0].data.main[0][0].json;
				// @TODO: Figure out [0] ... [0][0]
				// itemIndex, runIndex, outputIndex - order?
			} catch (_) {
				return;
			}
		},

		getInputNodeName() {
			const workflow = this.getCurrentWorkflow();

			const input = workflow.connectionsByDestinationNode[this.activeNode.name];

			return input.main[0][0].node;
			// @TODO: Figure out [0][0]
			// itemIndex, runIndex, outputIndex - which two? order?
		},

		/**
		 * $('nodeName').first().json[ 				-> 		['field']
		 * $('nodeName').last().json[ 				-> 		['field']
		 * $('nodeName').item.json[ 					-> 		['field']
		 * $('nodeName').all()[index].json[ 	-> 		['field']
		 */
		nodeSelectorJsonFieldCompletions(context: CompletionContext): CompletionResult | null {
			const SELECTED_NODE_WITH_FIRST_OR_LAST_CALL_PLUS_JSON =
				/\$\((?<quotedNodeName>['"][\w\s]+['"])\)\.(?<method>(first|last))\(\)\.json\[.*/;

			const firstLastMatch = context.state.doc
				.toString()
				.match(SELECTED_NODE_WITH_FIRST_OR_LAST_CALL_PLUS_JSON);

			if (
				firstLastMatch &&
				firstLastMatch.groups &&
				firstLastMatch.groups.quotedNodeName &&
				firstLastMatch.groups.method
			) {
				const stub = context.matchBefore(SELECTED_NODE_WITH_FIRST_OR_LAST_CALL_PLUS_JSON);

				if (!stub || (stub.from === stub.to && !context.explicit)) return null;

				const { quotedNodeName, method } = firstLastMatch.groups;

				const jsonContent = this.getJsonValue(quotedNodeName);

				if (!jsonContent) return null;

				const options = Object.keys(jsonContent).map((field) => {
					return {
						label: `$(${quotedNodeName}).${method}().json['${field}']`,
						type: 'variable',
					};
				});

				return {
					from: stub.from,
					options,
				};
			}

			const SELECTED_NODE_WITH_ITEM_CALL_PLUS_JSON =
				/\$\((?<quotedNodeName>['"][\w\s]+['"])\)\.item\.json\[.*/;

			const itemMatch = context.state.doc.toString().match(SELECTED_NODE_WITH_ITEM_CALL_PLUS_JSON);

			if (
				itemMatch &&
				itemMatch.groups &&
				itemMatch.groups.quotedNodeName
			) {
				const stub = context.matchBefore(SELECTED_NODE_WITH_ITEM_CALL_PLUS_JSON);

				if (!stub || (stub.from === stub.to && !context.explicit)) return null;

				const { quotedNodeName } = itemMatch.groups;

				const jsonContent = this.getJsonValue(quotedNodeName);

				if (!jsonContent) return null;

				const options = Object.keys(jsonContent).map((field) => {
					return {
						label: `$(${quotedNodeName}).item.json['${field}']`,
						type: 'variable',
					};
				});

				return {
					from: stub.from,
					options,
				};
			}

			const SELECTED_NODE_WITH_ALL_CALL_PLUS_JSON =
				/\$\((?<quotedNodeName>['"][\w\s]+['"])\)\.all\(\)\[(?<index>\w+)\]\.json\[.*/;

			const allMatch = context.state.doc.toString().match(SELECTED_NODE_WITH_ALL_CALL_PLUS_JSON);

			if (allMatch && allMatch.groups && allMatch.groups.quotedNodeName && allMatch.groups.index) {
				const stub = context.matchBefore(SELECTED_NODE_WITH_ALL_CALL_PLUS_JSON);

				if (!stub || (stub.from === stub.to && !context.explicit)) return null;

				const { quotedNodeName, index } = allMatch.groups;

				const jsonContent = this.getJsonValue(quotedNodeName);

				if (!jsonContent) return null;

				const options = Object.keys(jsonContent).map((field) => {
					return {
						label: `$(${quotedNodeName}).all()[${index}].json['${field}']`,
						type: 'variable',
					};
				});

				return {
					from: stub.from,
					options,
				};
			}

			return null;
		},

		/**
		 * $input.first().json[ 					-> 		['field']
		 * $input.last().json[ 						-> 		['field']
		 * $input.all()[index].json[ 			-> 		['field']
		 * $input.item.json[ 							-> 		['field']
		 */
		$inputJsonFieldCompletions(context: CompletionContext): CompletionResult | null {
			const INPUT_WITH_FIRST_OR_LAST_CALL_PLUS_JSON = /\$input\.(?<method>(first|last))\(\)\.json\[.*/;

			const firstLastMatch = context.state.doc
				.toString()
				.match(INPUT_WITH_FIRST_OR_LAST_CALL_PLUS_JSON);

			if (
				firstLastMatch &&
				firstLastMatch.groups &&
				firstLastMatch.groups.method
			) {
				const stub = context.matchBefore(INPUT_WITH_FIRST_OR_LAST_CALL_PLUS_JSON);

				if (!stub || (stub.from === stub.to && !context.explicit)) return null;

				const { method } = firstLastMatch.groups;

				const jsonContent = this.getJsonValue(this.getInputNodeName());

				if (!jsonContent) return null;

				const options = Object.keys(jsonContent).map((field) => {
					return {
						label: `$input.${method}().json['${field}']`,
						type: 'variable',
					};
				});

				return {
					from: stub.from,
					options,
				};
			}

			const SELECTED_NODE_WITH_ITEM_CALL_PLUS_JSON = /\$input\.item\.json\[.*/;

			const itemMatch = context.state.doc.toString().match(SELECTED_NODE_WITH_ITEM_CALL_PLUS_JSON);

			if (itemMatch) {
				const stub = context.matchBefore(SELECTED_NODE_WITH_ITEM_CALL_PLUS_JSON);

				if (!stub || (stub.from === stub.to && !context.explicit)) return null;

				const jsonContent = this.getJsonValue(this.getInputNodeName());

				if (!jsonContent) return null;

				const options = Object.keys(jsonContent).map((field) => {
					return {
						label: `$input.item.json['${field}']`,
						type: 'variable',
					};
				});

				return {
					from: stub.from,
					options,
				};
			}

			const SELECTED_NODE_WITH_ALL_CALL_PLUS_JSON = /\$input\.all\(\)\[(?<index>\w+)\]\.json\[.*/;

			const allMatch = context.state.doc.toString().match(SELECTED_NODE_WITH_ALL_CALL_PLUS_JSON);

			if (allMatch && allMatch.groups && allMatch.groups.index) {
				const stub = context.matchBefore(SELECTED_NODE_WITH_ALL_CALL_PLUS_JSON);

				if (!stub || (stub.from === stub.to && !context.explicit)) return null;

				const { index } = allMatch.groups;

				const jsonContent = this.getJsonValue(this.getInputNodeName());

				if (!jsonContent) return null;

				const options = Object.keys(jsonContent).map((field) => {
					return {
						label: `$input.all()[${index}].json['${field}']`,
						type: 'variable',
					};
				});

				return {
					from: stub.from,
					options,
				};
			}

			return null;
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
