import Vue from 'vue';
import { CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import type { CodeNodeEditorMixin } from '../types';

const VARIABLE_DECLARATION_KEYWORDS = ['var', 'const', 'let'];

export const multilineCompletions = (Vue as CodeNodeEditorMixin).extend({
	methods: {
		/**
		 * Complete a user-defined variable to any of the supported completions.
		 *
		 * const i = $input;
		 * i. -> .first()
		 */
		multilineCompletions(context: CompletionContext): CompletionResult | null {
			let map: Record<string, string> = {};

			try {
				map = this.variablesAndValues();
			} catch (_) {
				return null;
			}

			// { i: "$input", a: "'abc'" }

			for (const [variable, value] of Object.entries(map)) {
				// if (value === '$input') {
				// 	const completions = this.inputCompletions(context, variable);
				// 	if (completions) return completions;
				// }
			}

			return null;
		},

		variablesAndValues() {
			return this.variableDeclarationLines().reduce<Record<string, string>>((acc, line) => {
				const [left, right] = line.split('='); // can throw if incomplete assignment

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
				VARIABLE_DECLARATION_KEYWORDS.some((varType) => line.startsWith(varType));

			return docLines.filter(isVariableDeclarationLine);
		},
	},
});
