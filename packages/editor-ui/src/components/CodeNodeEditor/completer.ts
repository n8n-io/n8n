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

import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import type { Extension } from '@codemirror/state';
import type { CodeNodeEditorMixin } from './types';

export const completerExtension = mixins(
	Vue as CodeNodeEditorMixin,
	baseCompletions,
	requireCompletions,
	executionCompletions,
	workflowCompletions,
	prevNodeCompletions,
	luxonCompletions,
	itemIndexCompletions,
	itemFieldCompletions,
	jsonFieldCompletions,
).extend({
	methods: {
		autocompletionExtension(): Extension {
			return autocompletion({
				compareCompletions: (a: Completion, b: Completion) => {
					if (/\.json$|id$|id['"]\]$/.test(a.label)) return 0;

					// @TODO: first, last, item, all

					return a.label.localeCompare(b.label);
				},
				override: [
					jsSnippets,
					localCompletionSource,

					// core
					this.baseCompletions,
					this.requireCompletions,
					this.nodeSelectorCompletions,
					this.prevNodeCompletions,
					this.workflowCompletions,
					this.executionCompletions,

					// luxon
					this.todayCompletions,
					this.nowCompletions,
					this.dateTimeCompltions,

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

			let map: Record<string, string> = {};

			try {
				map = this.variablesAndValues();
			} catch (_) {
				return null;
			}

			if (Object.keys(map).length === 0) return null;

			/**
			 * Complete use of extended variable
			 *
			 * const x = $input;
			 * x.first(). -> .json
			 * x.first().json. -> .field
			 */

			const docLines = this.editor.state.doc.toString().split('\n');

			const varNames = Object.keys(map);

			const uses = this.extendedUses(docLines, varNames);

			for (const use of uses.itemField) {
				const matcher = use.replace(/\.$/, '');
				const completions = this.inputMethodCompletions(context, matcher);

				if (completions) return completions;
			}

			for (const use of uses.jsonField) {
				const matcher = use.replace(/\.$/, '');
				const completions = this.inputJsonFieldCompletions(context, matcher);

				if (completions) return completions;
			}

			/**
			 * Complete use of unextended variable
			 *
			 * const x = $input;
			 * x. -> .first()
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

			const INPUT_JSON_FIELD_REGEXES = Object.values({
				first: /\$input\.first\(\)\.json$/,
				last: /\$input\.last\(\)\.json$/,
				item: /\$input\.item\.json$/,
				all: /\$input\.all\(\)\[(?<index>\w+)\]\.json$/,
			});

			const SELECTOR_JSON_FIELD__REGEXES = Object.values({
				first: /\$\((?<quotedNodeName>['"][\w\s]+['"])\)\.first\(\)\.json$/,
				last: /\$\((?<quotedNodeName>['"][\w\s]+['"])\)\.last\(\)\.json$/,
				item: /\$\((?<quotedNodeName>['"][\w\s]+['"])\)\.item\.json$/,
				all: /\$\((?<quotedNodeName>['"][\w\s]+['"])\)\.all\(\)\[(?<index>\w+)\]\.json$/,
			});


			for (const [variable, value] of Object.entries(map)) {
				// core

				if (value === '$execution') return this.executionCompletions(context, variable);
				if (value === '$workflow') return this.workflowCompletions(context, variable);
				if (value === '$prevNode') return this.prevNodeCompletions(context, variable);

				// luxon

				if (value === '$now') return this.nowCompletions(context, variable);
				if (value === '$today') return this.todayCompletions(context, variable);
				if (value === 'DateTime') return this.dateTimeCompltions(context, variable);

				// item index

				if (value === '$input') return this.inputCompletions(context, variable);
				if (SELECTOR_REGEX.test(value)) return this.selectorCompletions(context, variable);

				// json field

				const inputJsonFieldMatched = INPUT_JSON_FIELD_REGEXES.some((regex) => regex.test(value));
				if (inputJsonFieldMatched) return this.inputJsonFieldCompletions(context, variable);

				const selectorJsonFieldMatched = SELECTOR_JSON_FIELD__REGEXES.some((regex) => regex.test(value));
				if (selectorJsonFieldMatched) return this.inputJsonFieldCompletions(context, variable);

				// item field

				const inputMethodMatched = INPUT_METHOD_REGEXES.some((regex) => regex.test(value));
				if (inputMethodMatched) return this.inputMethodCompletions(context, variable);

				const selectorMethodMatched = SELECTOR_METHOD_REGEXES.some((regex) => regex.test(value));
				if (selectorMethodMatched) return this.selectorMethodCompletions(context, variable);
			}

			return null;
		},

		// ----------------------------------
		//            helpers
		// ----------------------------------

		variablesAndValues() {
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
		 */
		extendedUses(docLines: string[], varNames: string[]) {
			return docLines.reduce<{ itemField: string[]; jsonField: string[] }>(
				(acc, cur) => {
					varNames.forEach((varName) => {
						// @TODO: Escape
						const regex = new RegExp(
							`(${varName}.first\\(\\)|${varName}.last\\(\\)|${varName}.item|${varName}.all\\(\\)\\[\\w+\\]).*`,
						);

						const match = cur.match(regex);

						if (!match) return;

						if (/json(\.|\[)$/.test(match[0])) {
							acc.jsonField.push(match[0]);
						} else {
							acc.itemField.push(match[0]);
						}
					});

					return acc;
				},
				{ itemField: [], jsonField: [] },
			);
		},
	},
});
