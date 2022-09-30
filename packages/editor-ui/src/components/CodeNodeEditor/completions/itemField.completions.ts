import Vue from 'vue';
import { addVarType, escape } from '../utils';
import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import type { CodeNodeEditorMixin } from '../types';

export const itemFieldCompletions = (Vue as CodeNodeEditorMixin).extend({
	methods: {
		/**
		 * - Complete `$input.first().` to `.json .binary`.
		 * - Complete `$input.last().` to `.json .binary`.
		 * - Complete `$input.item.` to `.json .binary` in single-item mode.
		 * - Complete `$input.all()[index].` to `.json .binary`.
		 */
		inputMethodCompletions(
			context: CompletionContext,
			matcher: string | null = null,
		): CompletionResult | null {
			const patterns =
				matcher === null
					? {
							first: /\$input\.first\(\)\..*/,
							last: /\$input\.last\(\)\..*/,
							item: /\$input\.item\..*/,
							all: /\$input\.all\(\)\[(?<index>\w+)\]\..*/,
					  }
					: {
							first: new RegExp(`${escape(matcher)}\..*`),
							last: new RegExp(`${escape(matcher)}\..*`),
							item: new RegExp(`${escape(matcher)}\..*`),
							all: new RegExp(`${escape(matcher)}\..*`),
					  };

			for (const [name, regex] of Object.entries(patterns)) {
				const preCursor = context.matchBefore(regex);

				if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) continue;

				let replacementBase = '';

				if (name === 'first') replacementBase = matcher ?? '$input.first()';

				if (name === 'last') replacementBase = matcher ?? '$input.last()';

				if (name === 'item') replacementBase = matcher ?? '$input.item';

				if (name === 'all') {
					const match = preCursor.text.match(regex);

					if (!match?.groups?.index) continue;

					const { index } = match.groups;

					replacementBase = matcher ?? `$input.all()[${index}]`;
				}

				const options: Completion[] = [
					{
						label: `${replacementBase}.json`,
						info: this.$locale.baseText('codeNodeEditor.autocompleter.json'),
					},
					{
						label: `${replacementBase}.binary`,
						info: this.$locale.baseText('codeNodeEditor.autocompleter.binary'),
					},
				];

				return {
					from: preCursor.from,
					options: options.map(addVarType),
				};
			}

			return null;
		},

		/**
		 * - Complete `$('nodeName').first().` to `.json .binary`.
		 * - Complete `$('nodeName').last().` to `.json .binary`.
		 * - Complete `$('nodeName').item.` to `.json .binary` in single-item mode.
		 * - Complete `$('nodeName').all()[index].` to `.json .binary`.
		 */
		selectorMethodCompletions(
			context: CompletionContext,
			matcher: string | null = null,
		): CompletionResult | null {
			const patterns =
				matcher === null
					? {
							first: /\$\((?<quotedNodeName>['"][\w\s]+['"])\)\.first\(\)\..*/,
							last: /\$\((?<quotedNodeName>['"][\w\s]+['"])\)\.last\(\)\..*/,
							item: /\$\((?<quotedNodeName>['"][\w\s]+['"])\)\.item\..*/,
							all: /\$\((?<quotedNodeName>['"][\w\s]+['"])\)\.all\(\)\[(?<index>\w+)\]\..*/,
					  }
					: {
							first: new RegExp(`(${matcher})\..*`),
							last: new RegExp(`(${matcher})\..*`),
							item: new RegExp(`(${matcher})\..*`),
							all: new RegExp(`(${matcher})\..*`),
					  };

			for (const [name, regex] of Object.entries(patterns)) {
				const preCursor = context.matchBefore(regex);

				if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) continue;

				const match = preCursor.text.match(regex);

				let start = '';

				if (!matcher && match?.groups?.quotedNodeName) {
					start = `$(${match.groups.quotedNodeName})`;
				}

				let replacementBase = '';

				if (name === 'first') replacementBase = matcher ?? `${start}.first()`;

				if (name === 'last') replacementBase = matcher ?? `${start}.last()`;

				if (name === 'item') replacementBase = matcher ?? `${start}.item`;

				if (name === 'all' && matcher) replacementBase = matcher;

				if (name === 'all' && !matcher) {
					const match = preCursor.text.match(regex);

					if (!match?.groups?.index) continue;

					replacementBase = `${start}.all()[${match.groups.index}]`;
				}

				const options: Completion[] = [
					{
						label: `${replacementBase}.json`,
						info: this.$locale.baseText('codeNodeEditor.autocompleter.json'),
					},
					{
						label: `${replacementBase}.binary`,
						info: this.$locale.baseText('codeNodeEditor.autocompleter.binary'),
					},
				];

				return {
					from: preCursor.from,
					options: options.map(addVarType),
				};
			}

			return null;
		},
	},
});
