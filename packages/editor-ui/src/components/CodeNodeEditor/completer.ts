import Vue from 'vue';
import mixins from 'vue-typed-mixins';
import { autocompletion } from '@codemirror/autocomplete';
import { localCompletionSource } from '@codemirror/lang-javascript';

import { baseCompletions } from './completions/base.completions';
import { jsSnippets } from './completions/js.snippets';
import { requireCompletions } from './completions/require.completions';
import { executionCompletions } from './completions/execution.completions';
import { workflowCompletions } from './completions/workflow.completions';
import { prevNodeCompletions } from './completions/prevNode.completions';
import { luxonCompletions } from './completions/luxon.completions';
import { itemIndexCompletions } from './completions/itemIndex.completions';
import { itemFieldCompletions } from './completions/itemField.completions';
import { jsonFieldCompletions } from './completions/jsonField.completions';
import { variablesCompletions } from './completions/variables.completions';

import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import type { Extension } from '@codemirror/state';
import type { CodeNodeEditorMixin } from './types';

export const completerExtension = mixins(
	Vue as CodeNodeEditorMixin,
	baseCompletions,
	requireCompletions,
	executionCompletions,
	workflowCompletions,
	variablesCompletions,
	prevNodeCompletions,
	luxonCompletions,
	itemIndexCompletions,
	itemFieldCompletions,
	jsonFieldCompletions,
).extend({
	methods: {
		autocompletionExtension(language: 'javaScript' | 'python'): Extension {
			const completions = [];
			if (language === 'javaScript') {
				completions.push(jsSnippets, localCompletionSource);
			}

			return autocompletion({
				compareCompletions: (a: Completion, b: Completion) => {
					if (/\.json$|id$|id['"]\]$/.test(a.label)) return 0;

					return a.label.localeCompare(b.label);
				},
				override: [
					...completions,

					// core
					this.itemCompletions,
					this.baseCompletions,
					this.requireCompletions,
					this.nodeSelectorCompletions,
					this.prevNodeCompletions,
					this.workflowCompletions,
					this.variablesCompletions,
					this.executionCompletions,

					// luxon
					this.todayCompletions,
					this.nowCompletions,
					this.dateTimeCompletions,

					// item index
					this.inputCompletions,
					this.selectorCompletions,

					// item field
					this.inputMethodCompletions,
					this.selectorMethodCompletions,

					// item json field
					this.inputJsonFieldCompletions,
					this.selectorJsonFieldCompletions,

					// multiline
					this.multilineCompletions,
				],
			});
		},

		/**
		 * Complete uses of variables to any of the supported completions.
		 */
		multilineCompletions(context: CompletionContext): CompletionResult | null {
			if (!this.editor) return null;

			let variablesToValues: Record<string, string> = {};

			try {
				variablesToValues = this.variablesToValues();
			} catch {
				return null;
			}

			if (Object.keys(variablesToValues).length === 0) return null;

			/**
			 * Complete uses of extended variables, i.e. variables having
			 * one or more dotted segments already.
			 *
			 * const x = $input;
			 * x.first(). -> .json
			 * x.first().json. -> .field
			 */

			const docLines = this.editor.state.doc.toString().split('\n');

			const varNames = Object.keys(variablesToValues);

			const uses = this.extendedUses(docLines, varNames);

			for (const use of uses.itemField) {
				const matcher = use.replace(/\.$/, '');
				const completions = this.matcherItemFieldCompletions(context, matcher, variablesToValues);

				if (completions) return completions;
			}

			for (const use of uses.jsonField) {
				const matcher = use.replace(/(\.|\[)$/, '');
				const completions = this.matcherJsonFieldCompletions(context, matcher, variablesToValues);

				if (completions) return completions;
			}

			/**
			 * Complete uses of unextended variables, i.e. variables having
			 * no dotted segment already.
			 *
			 * const x = $input;
			 * x. -> .first()
			 *
			 * const x = $input.first();
			 * x. -> .json
			 *
			 * const x = $input.first().json;
			 * x. -> .field
			 */

			const SELECTOR_REGEX = /^\$\((?<quotedNodeName>['"][\w\s]+['"])\)$/; // $('nodeName')

			const INPUT_METHOD_REGEXES = Object.values({
				first: /\$input\.first\(\)$/,
				last: /\$input\.last\(\)$/,
				item: /\$input\.item$/,
				all: /\$input\.all\(\)\[(?<index>\w+)\]$/,
			});

			const SELECTOR_METHOD_REGEXES = Object.values({
				first: /\$\((?<quotedNodeName>['"][\w\s]+['"])\)\.first\(\)$/,
				last: /\$\((?<quotedNodeName>['"][\w\s]+['"])\)\.last\(\)$/,
				item: /\$\((?<quotedNodeName>['"][\w\s]+['"])\)\.item$/,
				all: /\$\((?<quotedNodeName>['"][\w\s]+['"])\)\.all\(\)\[(?<index>\w+)\]$/,
			});

			const INPUT_JSON_REGEXES = Object.values({
				first: /\$input\.first\(\)\.json$/,
				last: /\$input\.last\(\)\.json$/,
				item: /\$input\.item\.json$/,
				all: /\$input\.all\(\)\[(?<index>\w+)\]\.json$/,
			});

			const SELECTOR_JSON_REGEXES = Object.values({
				first: /\$\((?<quotedNodeName>['"][\w\s]+['"])\)\.first\(\)\.json$/,
				last: /\$\((?<quotedNodeName>['"][\w\s]+['"])\)\.last\(\)\.json$/,
				item: /\$\((?<quotedNodeName>['"][\w\s]+['"])\)\.item\.json$/,
				all: /\$\((?<quotedNodeName>['"][\w\s]+['"])\)\.all\(\)\[(?<index>\w+)\]\.json$/,
			});

			for (const [variable, value] of Object.entries(variablesToValues)) {
				// core

				if (value === '$execution') return this.executionCompletions(context, variable);
				if (value === '$vars') return this.variablesCompletions(context, variable);
				if (value === '$workflow') return this.workflowCompletions(context, variable);
				if (value === '$prevNode') return this.prevNodeCompletions(context, variable);

				// luxon

				if (value === '$now') return this.nowCompletions(context, variable);
				if (value === '$today') return this.todayCompletions(context, variable);
				if (value === 'DateTime') return this.dateTimeCompletions(context, variable);

				// item index

				if (value === '$input') return this.inputCompletions(context, variable);
				if (SELECTOR_REGEX.test(value)) return this.selectorCompletions(context, variable);

				// json field

				const inputJsonMatched = INPUT_JSON_REGEXES.some((regex) => regex.test(value));
				const selectorJsonMatched = SELECTOR_JSON_REGEXES.some((regex) => regex.test(value));

				if (inputJsonMatched || selectorJsonMatched) {
					return this.matcherJsonFieldCompletions(context, variable, variablesToValues);
				}

				// item field

				const inputMethodMatched = INPUT_METHOD_REGEXES.some((regex) => regex.test(value));
				const selectorMethodMatched = SELECTOR_METHOD_REGEXES.some((regex) => regex.test(value));

				if (inputMethodMatched || selectorMethodMatched) {
					return this.matcherItemFieldCompletions(context, variable, variablesToValues);
				}
			}

			return null;
		},

		// ----------------------------------
		//            helpers
		// ----------------------------------

		/**
		 * Create a map of variables and the values they point to.
		 */
		variablesToValues() {
			return this.variableDeclarationLines().reduce<Record<string, string>>((acc, line) => {
				const [left, right] = line.split('=');

				const varName = left.replace(/(var|let|const)/, '').trim();
				const varValue = right.replace(/;/, '').trim();

				acc[varName] = varValue;

				return acc;
			}, {});
		},

		variableDeclarationLines() {
			if (!this.editor) return [];

			const docLines = this.editor.state.doc.toString().split('\n');

			const isVariableDeclarationLine = (line: string) =>
				['var', 'const', 'let'].some((varType) => line.startsWith(varType));

			return docLines.filter(isVariableDeclarationLine);
		},

		/**
		 * Collect uses of variables pointing to n8n syntax if they have been extended.
		 *
		 * x.first().
		 * x.first().json.
		 * x.json.
		 */
		extendedUses(docLines: string[], varNames: string[]) {
			return docLines.reduce<{ itemField: string[]; jsonField: string[] }>(
				(acc, cur) => {
					varNames.forEach((varName) => {
						const accessorPattern = `(${varName}.first\\(\\)|${varName}.last\\(\\)|${varName}.item|${varName}.all\\(\\)\\[\\w+\\]).*`;

						const methodMatch = cur.match(new RegExp(accessorPattern));

						if (methodMatch) {
							if (/json(\.|\[)$/.test(methodMatch[0])) {
								acc.jsonField.push(methodMatch[0]);
							} else {
								acc.itemField.push(methodMatch[0]);
							}
						}

						const jsonPattern = `^${varName}\\.json(\\.|\\[)$`;

						const jsonMatch = cur.match(new RegExp(jsonPattern));

						if (jsonMatch) {
							acc.jsonField.push(jsonMatch[0]);
						}
					});

					return acc;
				},
				{ itemField: [], jsonField: [] },
			);
		},
	},
});
