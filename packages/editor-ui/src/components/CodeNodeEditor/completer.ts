import Vue from 'vue';
import * as esprima from 'esprima';

import {
	autocompletion,
	completeFromList,
	Completion,
	CompletionContext,
	CompletionResult,
	snippetCompletion,
} from '@codemirror/autocomplete';
import { snippets, localCompletionSource } from '@codemirror/lang-javascript';
import {
	AUTOCOMPLETABLE_BUILT_IN_MODULES,
	labelInfo,
	NODE_TYPES_EXCLUDED_FROM_AUTOCOMPLETION,
} from './constants';
import { walk, isAllowedInDotNotation } from './utils';

import type { IDataObject, IPinData, IRunData } from 'n8n-workflow';
import type { Extension } from '@codemirror/state';
import type { INodeUi } from '@/Interface';
import type { CodeNodeEditorMixin, Multiline } from './types';
import type { Node } from 'estree';

const toVariableOption = (label: string) => ({ label, type: 'variable' });
const addVarType = (option: Completion) => ({ type: 'variable', ...option });

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
					this.executionCompletions,
					this.workflowCompletions,
					this.prevNodeCompletions,
					this.requireCompletions,
					this.luxonCompletions,
					this.inputCompletions,
					this.inputMethodCompletions,
					this.nodeSelectorJsonFieldCompletions,
					this.inputJsonFieldCompletions,
					this.multilineAutocompletions,
				],
			});
		},

		/**
		 * $ 		-> 		$execution $input $prevNode $runIndex
		 * 						$workflow $now $today $jmespath
		 * 						$('nodeName')
		 * $ 		-> 		$json $binary $itemIndex 								<runOnceForEachItem>
		 */
		globalCompletions(context: CompletionContext): CompletionResult | null {
			const preCursor = context.matchBefore(/\$\w*/);

			if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) return null;

			const GLOBAL_VARS_IN_ALL_MODES = [
				{ label: '$execution', info: 'Information about the current execution' },
				{ label: '$input', info: 'This node’s input data' },
				{ label: '$prevNode', info: 'The node providing the input data for this run' },
				{ label: '$workflow', info: 'Information about the workflow' },
				{ label: '$now', info: 'The current timestamp (as a Luxon object)' },
				{
					label: '$today',
					info: 'A timestamp representing the current day (at midnight, as a Luxon object)',
				},
				{ label: '$jmespath()', info: 'Evaluate a JMESPath expression' },
				{ label: '$runIndex', info: 'The index of the current run of this node' },
			];

			const options: Completion[] = GLOBAL_VARS_IN_ALL_MODES.map(addVarType);

			options.push(
				...this.autocompletableNodeNames.map((name) => {
					return {
						label: `$('${name}')`,
						type: 'variable',
					};
				}),
			);

			if (this.mode === 'runOnceForEachItem') {
				const GLOBAL_VARS_IN_EACH_ITEM_MODE = [
					{ label: '$json' },
					{ label: '$binary' },
					{ label: '$itemIndex', info: 'The position of the current item in the list of items' },
				];

				options.push(...GLOBAL_VARS_IN_EACH_ITEM_MODE.map(addVarType));
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

			const options: Completion[] = this.autocompletableNodeNames.map((nodeName) => {
				return {
					label: `$('${nodeName}')`,
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
		selectedNodeCompletions(
			context: CompletionContext,
			matcher = 'default',
		): CompletionResult | null {
			const pattern =
				matcher === 'default'
					? /\$\((?<quotedNodeName>['"][\w\s]+['"])\)\..*/
					: new RegExp(`${matcher}\..*`);

			const preCursor = context.matchBefore(pattern);

			if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) return null;

			const match = preCursor.text.match(pattern);

			if (matcher === 'default' && match?.groups?.quotedNodeName) {
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
						info: 'The parameters of the node',
					},
					{
						label: `$(${quotedNodeName}).context`,
						type: 'variable',
						info: 'Extra data about the node',
					},
				];

				if (this.mode === 'runOnceForAllItems') {
					options.push({
						label: `$(${quotedNodeName}).itemMatching()`,
						type: 'function',
						info: 'The item matching the input item at a specified index',
					});
				}

				if (this.mode === 'runOnceForEachItem') {
					options.push({
						label: `$(${quotedNodeName}).item`,
						type: 'variable',
						info: 'The item that generated the current one',
					});
				}

				return {
					from: preCursor.from,
					options,
				};
			}

			// user-defined matcher

			const options: Completion[] = [
				{
					label: `${matcher}.first()`,
					type: 'function',
				},
				{
					label: `${matcher}.last()`,
					type: 'function',
				},
				{
					label: `${matcher}.all()`,
					type: 'function',
				},
				{
					label: `${matcher}.params`,
					type: 'variable',
					info: 'The parameters of the node',
				},
				{
					label: `${matcher}.context`,
					type: 'variable',
					info: 'Extra data about the node',
				},
			];

			if (this.mode === 'runOnceForAllItems') {
				options.push({
					label: `${matcher}.itemMatching()`,
					type: 'function',
					info: 'The item matching the input item at a specified index',
				});
			}

			if (this.mode === 'runOnceForEachItem') {
				options.push({
					label: `${matcher}.item`,
					type: 'variable',
					info: 'The item that generated the current one',
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
		selectedNodeMethodCompletions(
			context: CompletionContext,
			matcher = 'default',
		): CompletionResult | null {
			const isDefaultMatcher = matcher === 'default';

			const matcherPattern = new RegExp(`(${matcher})\..*`);

			const patterns = isDefaultMatcher
				? {
						firstOrLast:
							/\$\((?<quotedNodeName>['"][\w\s]+['"])\)\.(?<method>(first|last))\(\)\..*/,
						item: /\$\((?<quotedNodeName>['"][\w\s]+['"])\)\.item\..*/,
						all: /\$\((?<quotedNodeName>['"][\w\s]+['"])\)\.all\(\)\[(?<index>\w+)\]\..*/,
				  }
				: {
						firstOrLast: matcherPattern,
						item: matcherPattern,
						all: matcherPattern,
				  };

			if (isDefaultMatcher) {
				for (const [name, regex] of Object.entries(patterns)) {
					const preCursor = context.matchBefore(regex);

					if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) continue;

					const match = preCursor.text.match(regex);

					if (name === 'firstOrLast' && match?.groups?.quotedNodeName && match.groups.method) {
						const { quotedNodeName, method } = match.groups;

						const options: Completion[] = [
							{
								label: `$(${quotedNodeName}).${method}().json`,
								info: labelInfo.json,
							},
							{
								label: `$(${quotedNodeName}).${method}().binary`,
								info: labelInfo.binary,
							},
						];

						return {
							from: preCursor.from,
							options: options.map(addVarType),
						};
					}

					if (
						name === 'item' &&
						this.mode === 'runOnceForEachItem' &&
						match?.groups?.quotedNodeName
					) {
						const { quotedNodeName } = match.groups;

						const options: Completion[] = [
							{
								label: `$(${quotedNodeName}).item.json`,
								info: labelInfo.json,
							},
							{
								label: `$(${quotedNodeName}).item.binary`,
								info: labelInfo.binary,
							},
						];

						return {
							from: preCursor.from,
							options: options.map(addVarType),
						};
					}

					if (name === 'all' && match?.groups?.quotedNodeName && match.groups.index) {
						const { quotedNodeName, index } = match.groups;

						const options: Completion[] = [
							{
								label: `$(${quotedNodeName}).all()[${index}].json`,
								info: labelInfo.json,
							},
							{
								label: `$(${quotedNodeName}).all()[${index}].binary`,
								info: labelInfo.binary,
							},
						];

						return {
							from: preCursor.from,
							options: options.map(addVarType),
						};
					}
				}

				return null;
			}

			// user-defined matcher

			for (const [name, regex] of Object.entries(patterns)) {
				const preCursor = context.matchBefore(regex);

				if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) continue;

				if (name === 'firstOrLast') {
					const options: Completion[] = [
						{ label: `${matcher}.json`, info: labelInfo.json },
						{ label: `${matcher}.binary`, info: labelInfo.binary },
					];

					return {
						from: preCursor.from,
						options: options.map(addVarType),
					};
				}

				if (name === 'item' && this.mode === 'runOnceForEachItem') {
					const options: Completion[] = [
						{ label: `${matcher}.json`, info: labelInfo.json },
						{ label: `${matcher}.binary`, info: labelInfo.binary },
					];

					return {
						from: preCursor.from,
						options: options.map(addVarType),
					};
				}

				if (name === 'all') {
					const options: Completion[] = [
						{ label: `${matcher}.json`, info: labelInfo.json },
						{ label: `${matcher}.binary`, info: labelInfo.binary },
					];

					return {
						from: preCursor.from,
						options: options.map(addVarType),
					};
				}
			}

			return null;
		},

		/**
		 * $execution. 		->		.id .mode .resumeUrl
		 */
		executionCompletions(context: CompletionContext, matcher = 'default'): CompletionResult | null {
			const isDefaultMatcher = matcher === 'default';

			const preCursor = context.matchBefore(
				isDefaultMatcher ? /\$execution\..*/ : new RegExp(`${matcher}\..*`),
			);

			if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) return null;

			const options: Completion[] = [
				{
					label: isDefaultMatcher ? '$execution.id' : `${matcher}.id`,
					info: 'The ID of the current execution',
				},
				{
					label: isDefaultMatcher ? '$execution.mode' : `${matcher}.mode`,
					info: "How the execution was triggered: 'manual' or 'automatic'",
				},
				{
					label: isDefaultMatcher ? '$execution.resumeUrl' : `${matcher}.resumeUrl`,
					info: "Used when using the 'wait' node to wait for a webhook. The webhook to call to resume execution",
				},
			];

			return {
				from: preCursor.from,
				options: options.map(addVarType),
			};
		},

		/**
		 * $workflow.		->		.id .name .active
		 */
		workflowCompletions(context: CompletionContext, matcher = 'default'): CompletionResult | null {
			const isDefaultMatcher = matcher === 'default';

			const preCursor = context.matchBefore(
				isDefaultMatcher ? /\$workflow\..*/ : new RegExp(`${matcher}\..*`),
			);

			if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) return null;

			const options: Completion[] = [
				{
					label: isDefaultMatcher ? '$workflow.id' : `${matcher}.id`,
					info: 'The ID of the workflow',
				},
				{
					label: isDefaultMatcher ? '$workflow.name' : `${matcher}.name`,
					info: 'The name of the workflow',
				},
				{
					label: isDefaultMatcher ? '$workflow.active' : `${matcher}.active`,
					info: 'Whether the workflow is active or not (boolean)',
				},
			];

			return {
				from: preCursor.from,
				options: options.map(addVarType),
			};
		},

		/**
		 * $prevNode.		->		.name .outputIndex .runIndex
		 */
		prevNodeCompletions(context: CompletionContext, matcher = 'default'): CompletionResult | null {
			const isDefaultMatcher = matcher === 'default';

			const preCursor = context.matchBefore(
				isDefaultMatcher ? /\$prevNode\..*/ : new RegExp(`${matcher}\..*`),
			);

			if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) return null;

			const options: Completion[] = [
				{
					label: isDefaultMatcher ? '$prevNode.name' : `${matcher}.name`,
					info: 'The name of the node providing the input data for this run',
				},
				{
					label: isDefaultMatcher ? '$prevNode.outputIndex' : `${matcher}.outputIndex`,
					info: 'The output connector of the node providing input data for this run',
				},
				{
					label: isDefaultMatcher ? '$prevNode.runIndex' : `${matcher}.runIndex`,
					info: 'The run of the node providing input data to the current one',
				},
			];

			return {
				from: preCursor.from,
				options: options.map(addVarType),
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
		 * $now.			->		luxon methods and getters
		 * $today.		->		luxon methods and getters
		 * DateTime.		->	luxon DateTime static methods
		 */
		luxonCompletions(
			context: CompletionContext,
			matcher = 'default',
			value: string | null = null,
		): CompletionResult | null {
			const isDefaultMatcher = matcher === 'default';

			const pattern = isDefaultMatcher
				? /(?<luxonEntity>\$now|\$today|DateTime)\..*/
				: new RegExp(`(${matcher})\..*`);

			const preCursor = context.matchBefore(pattern);

			if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) return null;

			const match = preCursor.text.match(pattern);

			if (isDefaultMatcher) {
				if (!match?.groups?.luxonEntity) return null;

				const { luxonEntity } = match.groups;

				if (luxonEntity === 'DateTime') {
					const options: Completion[] = this.luxonDateTimeStaticMethods().map(
						([method, description]) => {
							return {
								label: `DateTime.${method}()`,
								type: 'function',
								info: description,
							};
						},
					);

					return {
						from: preCursor.from,
						options,
					};
				}

				const options: Completion[] = this.luxonInstanceMethods().map(([method, description]) => {
					return {
						label: `${luxonEntity}.${method}()`,
						type: 'function',
						info: description,
					};
				});

				return {
					from: preCursor.from,
					options,
				};
			}

			// user-defined matcher

			if (match?.length !== 2) return null; // full match and subgroup

			const [_, variable] = match;

			if (value === 'DateTime') {
				const options: Completion[] = this.luxonDateTimeStaticMethods().map(
					([method, description]) => {
						return {
							label: `${variable}.${method}()`,
							type: 'function',
							info: description,
						};
					},
				);

				return {
					from: preCursor.from,
					options,
				};
			}

			const options: Completion[] = this.luxonInstanceMethods().map(([method, description]) => {
				return {
					label: `${variable}.${method}()`,
					type: 'function',
					info: description,
				};
			});

			return {
				from: preCursor.from,
				options,
			};
		},

		/**
		 * $input.		->		.first() .last() .all()
		 * $input.		->		.item												<runOnceForEachItem>
		 */
		inputCompletions(context: CompletionContext, matcher = 'default'): CompletionResult | null {
			const isDefaultMatcher = matcher === 'default';

			const preCursor = context.matchBefore(
				isDefaultMatcher ? /\$input\..*/ : new RegExp(`${matcher}\..*`),
			);

			if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) return null;

			const options: Completion[] = [
				{
					label: isDefaultMatcher ? '$input.first()' : `${matcher}.first()`,
					type: 'function',
					info: 'The first item',
				},
				{
					label: isDefaultMatcher ? '$input.last()' : `${matcher}.last()`,
					type: 'function',
					info: 'The last item',
				},
				{
					label: isDefaultMatcher ? '$input.all()' : `${matcher}.all()`,
					type: 'function',
					info: 'All items',
				},
			];

			if (this.mode === 'runOnceForEachItem') {
				options.push({
					label: isDefaultMatcher ? '$input.item' : `${matcher}.item`,
					type: 'variable',
					info: 'The current item',
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
		inputMethodCompletions(
			context: CompletionContext,
			matcher = 'default',
		): CompletionResult | null {
			const isDefaultMatcher = matcher === 'default';

			const matcherPattern = new RegExp(`(${matcher})\..*`);

			const patterns = isDefaultMatcher
				? {
						firstOrLast: /\$input\.(?<method>(first|last))\(\)\..*/,
						item: /\$input\.item\..*/,
						all: /\$input\.all\(\)\[(?<index>\w+)\]\..*/,
				  }
				: {
						firstOrLast: matcherPattern,
						item: matcherPattern,
						all: matcherPattern,
				  };

			if (isDefaultMatcher) {
				for (const [name, regex] of Object.entries(patterns)) {
					const preCursor = context.matchBefore(regex);

					if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) continue;

					const match = preCursor.text.match(regex);

					if (name === 'firstOrLast' && match?.groups?.method) {
						const { method } = match.groups;

						const options: Completion[] = [
							{
								label: `$input.${method}().json`,
								info: labelInfo.json,
							},
							{ label: `$input.${method}().binary`, info: labelInfo.binary },
						];

						return {
							from: preCursor.from,
							options: options.map(addVarType),
						};
					}

					if (name === 'item' && this.mode === 'runOnceForEachItem') {
						const options: Completion[] = [
							{
								label: '$input.item.json',
								info: labelInfo.json,
							},
							{ label: '$input.item.binary', info: labelInfo.binary },
						];

						return {
							from: preCursor.from,
							options: options.map(addVarType),
						};
					}

					if (name === 'all' && match?.groups?.index) {
						const { index } = match.groups;

						const options: Completion[] = [
							{
								label: `$input.all()[${index}].json`,
								info: labelInfo.json,
							},
							{ label: `$input.all()[${index}].binary`, info: labelInfo.binary },
						];

						return {
							from: preCursor.from,
							options: options.map(addVarType),
						};
					}
				}

				return null;
			}

			// user-defined matcher

			for (const [name, regex] of Object.entries(patterns)) {
				const preCursor = context.matchBefore(regex);

				if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) continue;

				if (name === 'firstOrLast') {
					const options: Completion[] = [
						{ label: `${matcher}.json`, info: labelInfo.json },
						{ label: `${matcher}.binary`, info: labelInfo.binary },
					];

					return {
						from: preCursor.from,
						options: options.map(addVarType),
					};
				}

				if (name === 'item' && this.mode === 'runOnceForEachItem') {
					const options: Completion[] = [
						{ label: `${matcher}.json`, info: labelInfo.json },
						{ label: `${matcher}.binary`, info: labelInfo.binary },
					];

					return {
						from: preCursor.from,
						options: options.map(addVarType),
					};
				}

				if (name === 'all') {
					const options: Completion[] = [
						{ label: `${matcher}.json`, info: labelInfo.json },
						{ label: `${matcher}.binary`, info: labelInfo.binary },
					];

					return {
						from: preCursor.from,
						options: options.map(addVarType),
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
		nodeSelectorJsonFieldCompletions(
			context: CompletionContext,
			matcher = 'default',
			value: string | null = null,
		): CompletionResult | null {
			const isDefaultMatcher = matcher === 'default';

			const matcherPattern = new RegExp(`(${matcher})\..*`);

			const patterns = isDefaultMatcher
				? {
						firstOrLast:
							/\$\((?<quotedNodeName>['"][\w\s]+['"])\)\.(?<method>(first|last))\(\)\.json(\[|\.).*/,
						item: /\$\((?<quotedNodeName>['"][\w\s]+['"])\)\.item\.json(\[|\.).*/,
						all: /\$\((?<quotedNodeName>['"][\w\s]+['"])\)\.all\(\)\[(?<index>\w+)\]\.json(\[|\.).*/,
				  }
				: {
						firstOrLast: matcherPattern,
						item: matcherPattern,
						all: matcherPattern,
				  };

			if (isDefaultMatcher) {
				for (const [name, regex] of Object.entries(patterns)) {
					const preCursor = context.matchBefore(regex);

					if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) continue;

					const match = preCursor.text.match(regex);

					if (name === 'firstOrLast' && match?.groups?.quotedNodeName && match.groups.method) {
						const { quotedNodeName, method } = match.groups;

						return this.makeJsonFieldCompletions(
							preCursor,
							this.getJsonOutput(quotedNodeName, { preJson: method }),
							`$(${quotedNodeName}).${method}().json`,
						);
					}

					if (
						name === 'item' &&
						this.mode === 'runOnceForEachItem' &&
						match?.groups?.quotedNodeName
					) {
						const { quotedNodeName } = match.groups;

						return this.makeJsonFieldCompletions(
							preCursor,
							this.getJsonOutput(quotedNodeName),
							`$(${quotedNodeName}).item.json`,
						);
					}

					if (name === 'all' && match?.groups?.quotedNodeName && match.groups.index) {
						const { quotedNodeName, index } = match.groups;

						return this.makeJsonFieldCompletions(
							preCursor,
							this.getJsonOutput(quotedNodeName, { index: parseInt(index, 10) }),
							`$(${quotedNodeName}).all()[${index}].json`,
						);
					}
				}

				return null;
			}

			// user-defined matcher

			for (const [name, regex] of Object.entries(patterns)) {
				const preCursor = context.matchBefore(regex);

				if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) continue;

				const match = preCursor.text.match(regex);

				if (name === 'firstOrLast' && value) {
					const method = value.includes('first') ? 'first' : 'last';

					const inputNodeName = this.getInputNodeName();

					if (!inputNodeName) continue;

					return this.makeJsonVarCompletions(
						preCursor,
						this.getJsonOutput(inputNodeName, { preJson: method }),
					);
				}

				if (name === 'item' && this.mode === 'runOnceForEachItem') {
					const inputNodeName = this.getInputNodeName();

					if (!inputNodeName) continue;

					return this.makeJsonVarCompletions(preCursor, this.getJsonOutput(inputNodeName));
				}

				if (name === 'all' && match?.groups?.index) {
					const { index } = match.groups;

					const inputNodeName = this.getInputNodeName();

					if (!inputNodeName) continue;

					return this.makeJsonVarCompletions(
						preCursor,
						this.getJsonOutput(inputNodeName, { index: parseInt(index, 10) }),
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
		inputJsonFieldCompletions(
			context: CompletionContext,
			matcher = 'default',
			value: string | null = null,
		): CompletionResult | null {
			const isDefaultMatcher = matcher === 'default';

			const matcherPattern = new RegExp(`(${matcher})\..*`);

			const patterns = isDefaultMatcher
				? {
						firstOrLast: /\$input\.(?<method>(first|last))\(\)\.json(\[|\.).*/,
						item: /\$input\.item\.json(\[|\.).*/,
						all: /\$input\.all\(\)\[(?<index>\w+)\]\.json(\[|\.).*/,
				  }
				: {
						firstOrLast: matcherPattern,
						item: matcherPattern,
						all: matcherPattern,
				  };

			if (isDefaultMatcher) {
				for (const [name, regex] of Object.entries(patterns)) {
					const preCursor = context.matchBefore(regex);

					if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) continue;

					const match = preCursor.text.match(regex);

					if (name === 'firstOrLast' && match?.groups?.method) {
						const { method } = match.groups;

						const inputNodeName = this.getInputNodeName();

						if (!inputNodeName) continue;

						return this.makeJsonFieldCompletions(
							preCursor,
							this.getJsonOutput(inputNodeName, { preJson: method }),
							`$input.${method}().json`,
						);
					}

					if (name === 'item' && this.mode === 'runOnceForEachItem') {
						const inputNodeName = this.getInputNodeName();

						if (!inputNodeName) continue;

						return this.makeJsonFieldCompletions(
							preCursor,
							this.getJsonOutput(inputNodeName),
							'$input.item.json',
						);
					}

					if (name === 'all' && match?.groups?.index) {
						const { index } = match.groups;

						const inputNodeName = this.getInputNodeName();

						if (!inputNodeName) continue;

						return this.makeJsonFieldCompletions(
							preCursor,
							this.getJsonOutput(inputNodeName, { index: parseInt(index, 10) }),
							`$input.all()[${index}].json`,
						);
					}
				}

				return null;
			}

			// user-defined matcher

			for (const [name, regex] of Object.entries(patterns)) {
				const preCursor = context.matchBefore(regex);

				if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) continue;

				const match = preCursor.text.match(regex);

				if (name === 'firstOrLast' && value) {
					const method = value.includes('first') ? 'first' : 'last';

					const inputNodeName = this.getInputNodeName();

					if (!inputNodeName) continue;

					return this.makeJsonVarCompletions(
						preCursor,
						this.getJsonOutput(inputNodeName, { preJson: method }),
					);
				}

				if (name === 'item' && this.mode === 'runOnceForEachItem') {
					const inputNodeName = this.getInputNodeName();

					if (!inputNodeName) continue;

					return this.makeJsonVarCompletions(preCursor, this.getJsonOutput(inputNodeName));
				}

				if (name === 'all' && match?.groups?.index) {
					const { index } = match.groups;

					const inputNodeName = this.getInputNodeName();

					if (!inputNodeName) continue;

					return this.makeJsonVarCompletions(
						preCursor,
						this.getJsonOutput(inputNodeName, { index: parseInt(index, 10) }),
					);
				}
			}

			return null;
		},

		multilineAutocompletions(context: CompletionContext) {
			if (!this.editor) return null;

			const doc = this.editor.state.doc.toString();
			const variableDeclarationLines = doc
				.split('\n')
				.filter((line) =>
					['var', 'const', 'let'].some((variableType) => line.startsWith(variableType)),
				);

			const map: Record<string, string> = {};

			const isN8nSyntax = (str: string) => str.startsWith('$') || str.startsWith('DateTime');

			for (const line of variableDeclarationLines) {
				let ast: esprima.Program | null = null;

				try {
					ast = esprima.parseScript(line, { range: true });
				} catch (_) {
					continue;
				}

				const isVariableDeclaratorWithInit = (node: Node): node is Multiline.TargetNode =>
					node.type === 'VariableDeclaration' &&
					node.declarations.length === 1 &&
					node.declarations[0].type === 'VariableDeclarator' &&
					node.declarations[0].init !== undefined &&
					node.declarations[0].init !== null;

				/**
				 * const x = $input;
				 */

				const isInput = (node: Node) =>
					isVariableDeclaratorWithInit(node) &&
					node.declarations[0].init.type === 'Identifier' &&
					node.declarations[0].init.name === '$input';

				walk<Multiline.TargetNode>(ast, isInput).forEach((node) => {
					const [varName, value] = this.getVarNameAndValue(node);

					if (isN8nSyntax(value)) map[varName] = value;
				});

				/**
				 * const x = $('nodeName');
				 */

				const isNodeSelector = (node: Node) =>
					isVariableDeclaratorWithInit(node) &&
					node.declarations[0].init.type === 'CallExpression' &&
					node.declarations[0].init.callee.type === 'Identifier';

				walk<Multiline.TargetNode>(ast, isNodeSelector).forEach((node) => {
					const [varName, value] = this.getVarNameAndValue(node);

					if (isN8nSyntax(value)) map[varName] = value;
				});

				/**
				 * const x = $input.first();
				 * const x = $input.last();
				 * const x = $input.all()[index];
				 */

				const isInputMethod = (node: Node) =>
					isVariableDeclaratorWithInit(node) &&
					node.declarations[0].init.type === 'CallExpression' &&
					node.declarations[0].init.callee.type === 'MemberExpression' &&
					node.declarations[0].init.callee.object.type === 'Identifier' &&
					node.declarations[0].init.callee.property.type === 'Identifier' &&
					node.declarations[0].init.callee.property.name !== 'json';

				walk<Multiline.TargetNode>(ast, isInputMethod).forEach((node) => {
					const [varName, value] = this.getVarNameAndValue(node);

					if (isN8nSyntax(value)) map[varName] = value;
				});

				/**
				 * const x = $input.item;
				 */

				const isInputProperty = (node: Node) =>
					isVariableDeclaratorWithInit(node) &&
					node.declarations[0].init.type === 'MemberExpression' &&
					node.declarations[0].init.object.type === 'Identifier' &&
					node.declarations[0].init.object.name === '$input' &&
					node.declarations[0].init.property.type === 'Identifier';

				walk<Multiline.TargetNode>(ast, isInputProperty).forEach((node) => {
					const [varName, value] = this.getVarNameAndValue(node);

					if (isN8nSyntax(value)) map[varName] = value;
				});

				/**
				 * const x = $('nodeName').first();
				 * const x = $('nodeName').last();
				 * const x = $('nodeName').all()[index];
				 */

				const isSelectorMethod = (node: Node) =>
					isVariableDeclaratorWithInit(node) &&
					node.declarations[0].init.type === 'CallExpression' &&
					node.declarations[0].init.callee.type === 'MemberExpression' &&
					node.declarations[0].init.callee.object.type === 'CallExpression' &&
					node.declarations[0].init.callee.property.type === 'Identifier';

				walk<Multiline.TargetNode>(ast, isSelectorMethod).forEach((node) => {
					const [varName, value] = this.getVarNameAndValue(node);

					if (isN8nSyntax(value)) map[varName] = value;
				});

				/**
				 * const x = $('nodeName').item;
				 */

				const isSelectorProperty = (node: Node) =>
					isVariableDeclaratorWithInit(node) &&
					node.declarations[0].init.type === 'MemberExpression' &&
					node.declarations[0].init.object.type === 'CallExpression' &&
					node.declarations[0].init.property.type === 'Identifier' &&
					node.declarations[0].init.property.name !== 'json';

				walk<Multiline.TargetNode>(ast, isSelectorProperty).forEach((node) => {
					const [varName, value] = this.getVarNameAndValue(node);

					if (isN8nSyntax(value)) map[varName] = value;
				});

				/**
				 * const x = DateTime.method(arg);
				 */

				const isDateTimeMethod = (node: Node) =>
					isVariableDeclaratorWithInit(node) &&
					node.declarations[0].init.type === 'CallExpression' &&
					node.declarations[0].init.callee.type === 'MemberExpression' &&
					node.declarations[0].init.callee.object.type === 'Identifier' &&
					node.declarations[0].init.callee.object.name === 'DateTime';

				walk<Multiline.TargetNode>(ast, isDateTimeMethod).forEach((node) => {
					const [varName, value] = this.getVarNameAndValue(node);

					if (isN8nSyntax(value)) map[varName] = value;
				});

				/**
				 * const x = $input.first().json;
				 * const x = $input.last().json;
				 */

				const isInputFirstOrLastJson = (node: Node) =>
					isVariableDeclaratorWithInit(node) &&
					node.declarations[0].init.type === 'MemberExpression' &&
					node.declarations[0].init.object.type === 'CallExpression' &&
					node.declarations[0].init.property.type === 'Identifier' &&
					node.declarations[0].init.property.name === 'json';

				walk<Multiline.TargetNode>(ast, isInputFirstOrLastJson).forEach((node) => {
					const [varName, value] = this.getVarNameAndValue(node);

					if (isN8nSyntax(value)) map[varName] = value;
				});

				/**
				 * const x = $input.all()[index].json;
				 * const x = $input.item.json;
				 */

				const isInputAllOrItemJson = (node: Node) =>
					isVariableDeclaratorWithInit(node) &&
					node.declarations[0].init.type === 'MemberExpression' &&
					node.declarations[0].init.property.type === 'Identifier' &&
					node.declarations[0].init.property.name === 'json';

				walk<Multiline.TargetNode>(ast, isInputAllOrItemJson).forEach((node) => {
					const [varName, value] = this.getVarNameAndValue(node);

					if (isN8nSyntax(value)) map[varName] = value;
				});
			}

			if (Object.keys(map).length === 0) return null;

			for (const [key, value] of Object.entries(map)) {
				/**
				 * $input
				 * $execution
				 * $workflow
				 * $prevNode
				 * $now
				 * $today
				 * DateTime
				 */

				if (value === '$input') {
					const completions = this.inputCompletions(context, key);
					if (completions) return completions;
				}

				if (value === '$execution') {
					const completions = this.executionCompletions(context, key);
					if (completions) return completions;
				}

				if (value === '$workflow') {
					const completions = this.workflowCompletions(context, key);
					if (completions) return completions;
				}

				if (value === '$prevNode') {
					const completions = this.prevNodeCompletions(context, key);
					if (completions) return completions;
				}

				if (
					['$now', '$today', 'DateTime'].includes(value) ||
					/DateTime\.(\w+)\(\w+\)/.test(value)
				) {
					const completions = this.luxonCompletions(context, key, value);
					if (completions) return completions;
				}

				/**
				 * $input.first().json
				 * $input.last().json
				 * $input.item.json
				 * $input.all()[index].json
				 */

				if (
					/\$input\.(first|last)\(\)\.json/.test(value) ||
					/\$input\.item\.json/.test(value) ||
					/\$input\.all\(\)\[\w+\]\.json/.test(value)
				) {
					const completions = this.inputJsonFieldCompletions(context, key, value);
					if (completions) return completions;
				}

				/**
				 * $input.first()
				 * $input.last()
				 * $input.item
				 * $input.all()[index]
				 */

				if (
					/\$input\.(first|last)\(\);?$/.test(value) || // `;?$` to prevent overlap with previous
					/\$input\.item;?$/.test(value) ||
					/\$input\.all\(\)\[\w+\];?$/.test(value)
				) {
					const completions = this.inputMethodCompletions(context, key);
					if (completions) return completions;
				}

				/**
				 * $('nodeName').first().json
				 * $('nodeName').last().json
				 * $('nodeName').item.json
				 * $('nodeName').all()[index].json
				 */

				if (/\$\((?<quotedNodeName>['"][\w\s]+['"])\)\.(.+)\.json/.test(value)) {
					const completions = this.nodeSelectorJsonFieldCompletions(context, key);
					if (completions) return completions;
				}

				/**
				 * $('nodeName').first()
				 * $('nodeName').last()
				 * $('nodeName').item
				 * $('nodeName').all()[index]
				 */

				if (/\$\((?<quotedNodeName>['"][\w\s]+['"])\)\.[^json]/.test(value)) {
					const completions = this.selectedNodeMethodCompletions(context, key);
					if (completions) return completions;
				}

				/**
				 * $('nodeName')
				 * $("nodeName")
				 */

				if (value.startsWith('$(')) {
					const completions = this.selectedNodeCompletions(context, key);
					if (completions) return completions;
				}
			}

			return null;
		},

		// ----------------------------------
		//            helpers
		// ----------------------------------

		getVarNameAndValue(node: Multiline.TargetNode) {
			if (!this.editor) return [];

			const varName = node.declarations[0].id.name;

			const [start, end] = node.declarations[0].init.range;

			return [varName, this.editor.state.doc.toString().trimStart().slice(start, end)];
		},

		/**
		 * Make completions for default items
		 *
		 * .json -> .json['field']
		 * .json -> .json.field
		 */
		makeJsonFieldCompletions(
			preCursor: NonNullable<ReturnType<CompletionContext['matchBefore']>>,
			jsonOutput: IDataObject | null,
			baseReplacement: `${string}.json`, // e.g. $input.first().json
		) {
			if (!jsonOutput) return null;

			// .json -> .json['field']
			if (preCursor.text.endsWith('.json[')) {
				const options: Completion[] = Object.keys(jsonOutput)
					.map((field) => `${baseReplacement}['${field}']`)
					.map((label) => ({ label, info: labelInfo.json }));

				return {
					from: preCursor.from,
					options,
				};
			}

			// .json -> .json.field
			if (preCursor.text.endsWith('.json.')) {
				const options: Completion[] = Object.keys(jsonOutput)
					.filter(isAllowedInDotNotation)
					.map((field) => `${baseReplacement}.${field}`)
					.map(toVariableOption);

				return {
					from: preCursor.from,
					options,
				};
			}

			return null;
		},

		/**
		 * Make completions for user-defined matchers
		 *
		 * x[ -> ['field']
		 * x. -> .field
		 */
		makeJsonVarCompletions(
			preCursor: NonNullable<ReturnType<CompletionContext['matchBefore']>>,
			jsonOutput: IDataObject | null,
		) {
			if (!jsonOutput) return null;

			// x[ -> x['field']
			if (/\w+\[$/.test(preCursor.text)) {
				const baseReplacement = preCursor.text.replace(/\[$/, '');

				const options: Completion[] = Object.keys(jsonOutput)
					.map((field) => `${baseReplacement}['${field}']`)
					.map(toVariableOption);

				return {
					from: preCursor.from,
					options,
				};
			}

			// x. -> x.field
			if (/^\w+\.$/.test(preCursor.text)) {
				const baseReplacement = preCursor.text.replace(/\.$/, '');

				const options: Completion[] = Object.keys(jsonOutput)
					.filter(isAllowedInDotNotation)
					.map((field) => `${baseReplacement}.${field}`)
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
		 *
		 * Only autocompletions for `all()` pass in the `index`.
		 */
		getJsonOutput(quotedNodeName: string, options?: { preJson?: string; index?: number }) {
			const nodeName = quotedNodeName.replace(/['"]/g, '');

			const pinData: IPinData | undefined = this.$store.getters.pinData;

			const nodePinData = pinData && pinData[nodeName];

			if (nodePinData) {
				try {
					let itemIndex = options?.index ?? 0;

					if (options?.preJson === 'last') {
						itemIndex = nodePinData.length - 1;
					}

					return nodePinData[itemIndex].json;
				} catch (_) {}
			}

			const runData: IRunData | null = this.$store.getters.getWorkflowRunData;

			const nodeRunData = runData && runData[nodeName];

			if (!nodeRunData) return null;

			try {
				let itemIndex = options?.index ?? 0;

				if (options?.preJson === 'last') {
					const inputItems = nodeRunData[0].data!.main[0]!;
					itemIndex = inputItems.length - 1;
				}

				return nodeRunData[0].data!.main[0]![itemIndex].json;
			} catch (_) {
				return null;
			}
		},

		/**
		 * Retrieve the name of the node that feeds into the active node.
		 */
		getInputNodeName() {
			try {
				const activeNode = this.$store.getters.activeNode;
				const workflow = this.getCurrentWorkflow();
				const input = workflow.connectionsByDestinationNode[activeNode.name];

				return input.main[0][0].node;
			} catch (_) {
				return null;
			}
		},

		luxonDateTimeStaticMethods() {
			return Object.entries({
				now: "Create a DateTime for the current instant, in the system's time zone",
				local: 'Create a local DateTime',
				utc: 'Create a DateTime in UTC',
				fromJSDate: 'Create a DateTime from a JavaScript Date object. Uses the default zone',
				fromMillis:
					'Create a DateTime from a number of milliseconds since the epoch (meaning since 1 January 1970 00:00:00 UTC). Uses the default zone',
				fromSeconds:
					'Create a DateTime from a number of seconds since the epoch (meaning since 1 January 1970 00:00:00 UTC). Uses the default zone',
				fromObject:
					"Create a DateTime from a JavaScript object with keys like 'year' and 'hour' with reasonable defaults",
				fromISO: 'Create a DateTime from an ISO 8601 string',
				fromRFC2822: 'Create a DateTime from an RFC 2822 string',
				fromHTTP: 'Create a DateTime from an HTTP header date',
				fromFormat: 'Create a DateTime from an input string and format string.',
				fromSQL: 'Create a DateTime from a SQL date, time, or datetime',
				invalid: 'Create an invalid DateTime.',
				isDateTime: 'Check if an object is a DateTime. Works across context boundaries',
			});
		},

		luxonInstanceMethods() {
			return Object.entries({
				isValid:
					'Returns whether the DateTime is valid. Invalid DateTimes occur when: The DateTime was created from invalid calendar information, such as the 13th month or February 30. The DateTime was created by an operation on another invalid date.',
				invalidReason:
					'Returns an error code if this DateTime is invalid, or null if the DateTime is valid',
				invalidExplanation:
					'Returns an explanation of why this DateTime became invalid, or null if the DateTime is valid',
				locale:
					"Get the locale of a DateTime, such 'en-GB'. The locale is used when formatting the DateTime",
				numberingSystem:
					"Get the numbering system of a DateTime, such 'beng'. The numbering system is used when formatting the DateTime",
				outputCalendar:
					"Get the output calendar of a DateTime, such 'islamic'. The output calendar is used when formatting the DateTime",
				zone: 'Get the time zone associated with this DateTime.',
				zoneName: 'Get the name of the time zone.',
				year: 'Get the year',
				quarter: 'Get the quarter',
				month: 'Get the month (1-12).',
				day: 'Get the day of the month (1-30ish).',
				hour: 'Get the hour of the day (0-23).',
				minute: 'Get the minute of the hour (0-59).',
				second: 'Get the second of the minute (0-59).',
				millisecond: 'Get the millisecond of the second (0-999).',
				weekYear: 'Get the week year',
				weekNumber: 'Get the week number of the week year (1-52ish).',
				weekday: 'Get the day of the week. 1 is Monday and 7 is Sunday.',
				ordinal: 'Get the ordinal (meaning the day of the year)',
				monthShort: "Get the human readable short month name, such as 'Oct'.",
				monthLong: "Get the human readable long month name, such as 'October'.",
				weekdayShort: "Get the human readable short weekday, such as 'Mon'.",
				weekdayLong: "Get the human readable long weekday, such as 'Monday'.",
				offset: 'Get the UTC offset of this DateTime in minutes',
				offsetNumber:
					'Get the short human name for the zone\'s current offset, for example "EST" or "EDT".',
				offsetNameShort:
					'Get the short human name for the zone\'s current offset, for example "EST" or "EDT".',
				offsetNameLong:
					'Get the long human name for the zone\'s current offset, for example "Eastern Standard Time" or "Eastern Daylight Time".',
				isOffsetFixed: "Get whether this zone's offset ever changes, as in a DST.",
				isInDST: 'Get whether the DateTime is in a DST.',
				isInLeapYear: 'Returns true if this DateTime is in a leap year, false otherwise',
				daysInMonth: "Returns the number of days in this DateTime's month",
				daysInYear: "Returns the number of days in this DateTime's year",
				weeksInWeekYear: "Returns the number of weeks in this DateTime's year",
				toUTC: "Set the DateTime's zone to UTC. Returns a newly-constructed DateTime.",
				toLocal:
					"Set the DateTime's zone to the host's local zone. Returns a newly-constructed DateTime.",
				setZone: "Set the DateTime's zone to specified zone. Returns a newly-constructed DateTime.",
				setLocale: 'Set the locale. Returns a newly-constructed DateTime.',
				set: 'Set the values of specified units. Returns a newly-constructed DateTime.',
				plus: 'Add hours, minutes, seconds, or milliseconds increases the timestamp by the right number of milliseconds.',
				minus:
					'Subtract hours, minutes, seconds, or milliseconds increases the timestamp by the right number of milliseconds.',
				startOf: 'Set this DateTime to the beginning of a unit of time.',
				endOf: 'Set this DateTime to the end (meaning the last millisecond) of a unit of time',
				toFormat:
					'Returns a string representation of this DateTime formatted according to the specified format string.',
				toLocaleString:
					'Returns a localized string representing this date. Accepts the same options as the Intl.DateTimeFormat constructor and any presets defined by Luxon.',
				toLocaleParts:
					'Returns an array of format "parts", meaning individual tokens along with metadata.',
				toISO: 'Returns an ISO 8601-compliant string representation of this DateTime',
				toISODate:
					"Returns an ISO 8601-compliant string representation of this DateTime's date component",
				toISOWeekDate:
					"Returns an ISO 8601-compliant string representation of this DateTime's week date",
				toISOTime:
					"Returns an ISO 8601-compliant string representation of this DateTime's time component",
				toRFC2822:
					'Returns an RFC 2822-compatible string representation of this DateTime, always in UTC',
				toHTTP:
					'Returns a string representation of this DateTime appropriate for use in HTTP headers.',
				toSQLDate:
					'Returns a string representation of this DateTime appropriate for use in SQL Date',
				toSQLTime:
					'Returns a string representation of this DateTime appropriate for use in SQL Time',
				toSQL:
					'Returns a string representation of this DateTime appropriate for use in SQL DateTime.',
				toString: 'Returns a string representation of this DateTime appropriate for debugging',
				valueOf: 'Returns the epoch milliseconds of this DateTime.',
				toMillis: 'Returns the epoch milliseconds of this DateTime.',
				toSeconds: 'Returns the epoch seconds of this DateTime.',
				toUnixInteger: 'Returns the epoch seconds (as a whole number) of this DateTime.',
				toJSON: 'Returns an ISO 8601 representation of this DateTime appropriate for use in JSON.',
				toBSON: 'Returns a BSON serializable equivalent to this DateTime.',
				toObject: "Returns a JavaScript object with this DateTime's year, month, day, and so on.",
				toJsDate: 'Returns a JavaScript Date equivalent to this DateTime.',
				diff: 'Return the difference between two DateTimes as a Duration.',
				diffNow: 'Return the difference between this DateTime and right now.',
				until: 'Return an Interval spanning between this DateTime and another DateTime',
				hasSame: 'Return whether this DateTime is in the same unit of time as another DateTime.',
				equals: 'Equality check',
				toRelative:
					"Returns a string representation of a this time relative to now, such as 'in two days'.",
				toRelativeCalendar:
					"Returns a string representation of this date relative to today, such as '\"'yesterday' or 'next month'",
				min: 'Return the min of several date times',
				max: 'Return the max of several date times',
			});
		},
	},
});

// @TODO: Move to i18n, alphabetize i18n keys
// @TODO: Telemetry
