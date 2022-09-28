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
				{
					label: '$execution',
					info: this.$locale.baseText('codeNodeEditor.autocompleter.$execution'),
				},
				{ label: '$input', info: this.$locale.baseText('codeNodeEditor.autocompleter.$input') },
				{
					label: '$prevNode',
					info: this.$locale.baseText('codeNodeEditor.autocompleter.$prevNode'),
				},
				{
					label: '$workflow',
					info: this.$locale.baseText('codeNodeEditor.autocompleter.$workflow'),
				},
				{ label: '$now', info: this.$locale.baseText('codeNodeEditor.autocompleter.$now') },
				{
					label: '$today',
					info: this.$locale.baseText('codeNodeEditor.autocompleter.$today'),
				},
				{ label: '$jmespath()', info: this.$locale.baseText('codeNodeEditor.autocompleter.$jmespath') },
				{ label: '$runIndex', info: this.$locale.baseText('codeNodeEditor.autocompleter.$runIndex') },
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
					{ label: '$itemIndex', info: this.$locale.baseText('codeNodeEditor.autocompleter.$itemIndex') },
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
						info: this.$locale.baseText('codeNodeEditor.autocompleter.quotedNodeName.first'),
					},
					{
						label: `$(${quotedNodeName}).last()`,
						type: 'function',
						info: this.$locale.baseText('codeNodeEditor.autocompleter.quotedNodeName.last'),
					},
					{
						label: `$(${quotedNodeName}).all()`,
						type: 'function',
						info: this.$locale.baseText('codeNodeEditor.autocompleter.quotedNodeName.all'),
					},
					{
						label: `$(${quotedNodeName}).params`,
						type: 'variable',
						info: this.$locale.baseText('codeNodeEditor.autocompleter.quotedNodeName.params'),
					},
					{
						label: `$(${quotedNodeName}).context`,
						type: 'variable',
						info: this.$locale.baseText('codeNodeEditor.autocompleter.quotedNodeName.context'),
					},
				];

				if (this.mode === 'runOnceForAllItems') {
					options.push({
						label: `$(${quotedNodeName}).itemMatching()`,
						type: 'function',
						info: this.$locale.baseText('codeNodeEditor.autocompleter.quotedNodeName.itemMatching'),
					});
				}

				if (this.mode === 'runOnceForEachItem') {
					options.push({
						label: `$(${quotedNodeName}).item`,
						type: 'variable',
						info: this.$locale.baseText('codeNodeEditor.autocompleter.quotedNodeName.item'),
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
					info: this.$locale.baseText('codeNodeEditor.autocompleter.quotedNodeName.params'),
				},
				{
					label: `${matcher}.context`,
					type: 'variable',
					info: this.$locale.baseText('codeNodeEditor.autocompleter.quotedNodeName.context'),
				},
			];

			if (this.mode === 'runOnceForAllItems') {
				options.push({
					label: `${matcher}.itemMatching()`,
					type: 'function',
					info: this.$locale.baseText('codeNodeEditor.autocompleter.quotedNodeName.itemMatching'),
				});
			}

			if (this.mode === 'runOnceForEachItem') {
				options.push({
					label: `${matcher}.item`,
					type: 'variable',
					info: this.$locale.baseText('codeNodeEditor.autocompleter.quotedNodeName.item'),
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
					info: this.$locale.baseText('codeNodeEditor.autocompleter.$execution.id'),
				},
				{
					label: isDefaultMatcher ? '$execution.mode' : `${matcher}.mode`,
					info: this.$locale.baseText('codeNodeEditor.autocompleter.$execution.mode'),
				},
				{
					label: isDefaultMatcher ? '$execution.resumeUrl' : `${matcher}.resumeUrl`,
					info: this.$locale.baseText('codeNodeEditor.autocompleter.$execution.resumeUrl'),
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
					info: this.$locale.baseText('codeNodeEditor.autocompleter.$workflow.id'),
				},
				{
					label: isDefaultMatcher ? '$workflow.name' : `${matcher}.name`,
					info: this.$locale.baseText('codeNodeEditor.autocompleter.$workflow.name'),
				},
				{
					label: isDefaultMatcher ? '$workflow.active' : `${matcher}.active`,
					info: this.$locale.baseText('codeNodeEditor.autocompleter.$workflow.active'),
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
					info: this.$locale.baseText('codeNodeEditor.autocompleter.$prevNode.name'),
				},
				{
					label: isDefaultMatcher ? '$prevNode.outputIndex' : `${matcher}.outputIndex`,
					info: this.$locale.baseText('codeNodeEditor.autocompleter.$prevNode.outputIndex'),
				},
				{
					label: isDefaultMatcher ? '$prevNode.runIndex' : `${matcher}.runIndex`,
					info: this.$locale.baseText('codeNodeEditor.autocompleter.$prevNode.runIndex'),
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
					info: this.$locale.baseText('codeNodeEditor.autocompleter.$input.first'),
				},
				{
					label: isDefaultMatcher ? '$input.last()' : `${matcher}.last()`,
					type: 'function',
					info: this.$locale.baseText('codeNodeEditor.autocompleter.$input.last'),
				},
				{
					label: isDefaultMatcher ? '$input.all()' : `${matcher}.all()`,
					type: 'function',
					info: this.$locale.baseText('codeNodeEditor.autocompleter.$input.all'),
				},
			];

			if (this.mode === 'runOnceForEachItem') {
				options.push({
					label: isDefaultMatcher ? '$input.item' : `${matcher}.item`,
					type: 'variable',
					info: this.$locale.baseText('codeNodeEditor.autocompleter.$input.item'),
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
				now: this.$locale.baseText('codeNodeEditor.completer.luxon.dateTimeStaticMethods.now'),
				local: this.$locale.baseText('codeNodeEditor.completer.luxon.dateTimeStaticMethods.local'),
				utc: this.$locale.baseText('codeNodeEditor.completer.luxon.dateTimeStaticMethods.utc'),
				fromJSDate: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.dateTimeStaticMethods.fromJSDate',
				),
				fromMillis: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.dateTimeStaticMethods.fromMillis',
				),
				fromSeconds: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.dateTimeStaticMethods.fromSeconds',
				),
				fromObject: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.dateTimeStaticMethods.fromObject',
				),
				fromISO: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.dateTimeStaticMethods.fromISO',
				),
				fromRFC2822: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.dateTimeStaticMethods.fromRFC2822',
				),
				fromHTTP: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.dateTimeStaticMethods.fromHTTP',
				),
				fromFormat: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.dateTimeStaticMethods.fromFormat',
				),
				fromSQL: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.dateTimeStaticMethods.fromSQL',
				),
				invalid: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.dateTimeStaticMethods.invalid',
				),
				isDateTime: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.dateTimeStaticMethods.isDateTime',
				),
			});
		},

		luxonInstanceMethods() {
			return Object.entries({
				isValid: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.isValid'),
				invalidReason: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.invalidReason',
				),
				invalidExplanation: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.invalidExplanation',
				),
				locale: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.locale'),
				numberingSystem: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.numberingSystem',
				),
				outputCalendar: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.outputCalendar',
				),
				zone: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.zone'),
				zoneName: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.zoneName'),
				year: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.year'),
				quarter: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.quarter'),
				month: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.month'),
				day: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.day'),
				hour: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.hour'),
				minute: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.minute'),
				second: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.second'),
				millisecond: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.millisecond',
				),
				weekYear: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.weekYear'),
				weekNumber: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.weekNumber',
				),
				weekday: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.weekday'),
				ordinal: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.ordinal'),
				monthShort: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.monthShort',
				),
				monthLong: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.monthLong',
				),
				weekdayShort: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.weekdayShort',
				),
				weekdayLong: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.weekdayLong',
				),
				offset: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.offset'),
				offsetNumber: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.offsetNumber',
				),
				offsetNameShort: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.offsetNameShort',
				),
				offsetNameLong: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.offsetNameLong',
				),
				isOffsetFixed: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.isOffsetFixed',
				),
				isInDST: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.isInDST'),
				isInLeapYear: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.isInLeapYear',
				),
				daysInMonth: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.daysInMonth',
				),
				daysInYear: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.daysInYear',
				),
				weeksInWeekYear: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.weeksInWeekYear',
				),
				toUTC: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.toUTC'),
				toLocal: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.toLocal'),
				setZone: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.setZone'),
				setLocale: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.setLocale',
				),
				set: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.set'),
				plus: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.plus'),
				minus: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.minus'),
				startOf: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.startOf'),
				endOf: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.endOf'),
				toFormat: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.toFormat'),
				toLocaleString: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.toLocaleString',
				),
				toLocaleParts: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.toLocaleParts',
				),
				toISO: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.toISO'),
				toISODate: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.toISODate',
				),
				toISOWeekDate: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.toISOWeekDate',
				),
				toISOTime: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.toISOTime',
				),
				toRFC2822: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.toRFC2822',
				),
				toHTTP: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.toHTTP'),
				toSQLDate: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.toSQLDate',
				),
				toSQLTime: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.toSQLTime',
				),
				toSQL: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.toSQL'),
				toString: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.toString'),
				valueOf: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.valueOf'),
				toMillis: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.toMillis'),
				toSeconds: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.toSeconds',
				),
				toUnixInteger: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.toUnixInteger',
				),
				toJSON: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.toJSON'),
				toBSON: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.toBSON'),
				toObject: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.toObject'),
				toJsDate: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.toJsDate'),
				diff: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.diff'),
				diffNow: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.diffNow'),
				until: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.until'),
				hasSame: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.hasSame'),
				equals: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.equals'),
				toRelative: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.toRelative',
				),
				toRelativeCalendar: this.$locale.baseText(
					'codeNodeEditor.completer.luxon.instanceMethods.toRelativeCalendar',
				),
				min: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.min'),
				max: this.$locale.baseText('codeNodeEditor.completer.luxon.instanceMethods.max'),
			});
		},
	},
});

// @TODO: Telemetry
