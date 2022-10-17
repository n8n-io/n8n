import Vue from 'vue';
import { escape } from '../utils';
import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import type { CodeNodeEditorMixin } from '../types';

export const itemIndexCompletions = (Vue as CodeNodeEditorMixin).extend({
	methods: {
		/**
		 * - Complete `$input.` to `.first() .last() .all() .itemMatching()` in all-items mode.
		 * - Complete `$input.` to `.item` in single-item mode.
		 */
		inputCompletions(context: CompletionContext, matcher = '$input'): CompletionResult | null {
			const pattern = new RegExp(`${escape(matcher)}\..*`);

			const preCursor = context.matchBefore(pattern);

			if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) return null;

			const options: Completion[] = [];

			if (this.mode === 'runOnceForAllItems') {
				options.push(
					{
						label: `${matcher}.first()`,
						type: 'function',
						info: this.$locale.baseText('codeNodeEditor.completer.$input.first'),
					},
					{
						label: `${matcher}.last()`,
						type: 'function',
						info: this.$locale.baseText('codeNodeEditor.completer.$input.last'),
					},
					{
						label: `${matcher}.all()`,
						type: 'function',
						info: this.$locale.baseText('codeNodeEditor.completer.$input.all'),
					},
					{
						label: `${matcher}.itemMatching()`,
						type: 'function',
						info: this.$locale.baseText('codeNodeEditor.completer.$input.itemMatching'),
					},
				);
			}

			if (this.mode === 'runOnceForEachItem') {
				options.push({
					label: `${matcher}.item`,
					type: 'variable',
					info: this.$locale.baseText('codeNodeEditor.completer.$input.item'),
				});
			}

			return {
				from: preCursor.from,
				options,
			};
		},

		/**
		 * - Complete `$('nodeName').` to `.params .context` in both modes.
		 * - Complete `$('nodeName').` to `.first() .last() .all() .itemMatching()` in all-items mode.
		 * - Complete `$('nodeName').` to `.item` in single-item mode.
		 */
		selectorCompletions(context: CompletionContext, matcher: string | null = null) {
			const pattern =
				matcher === null
					? /\$\((?<quotedNodeName>['"][\w\s]+['"])\)\..*/ // $('nodeName').
					: new RegExp(`${matcher}\..*`);

			const preCursor = context.matchBefore(pattern);

			if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) return null;

			const match = preCursor.text.match(pattern);

			let replacementBase = '';

			if (matcher === null && match?.groups?.quotedNodeName) {
				replacementBase = `$(${match.groups.quotedNodeName})`;
			} else if (matcher) {
				replacementBase = matcher;
			}

			const options: Completion[] = [
				{
					label: `${replacementBase}.params`,
					type: 'variable',
					info: this.$locale.baseText('codeNodeEditor.completer.selector.params'),
				},
				{
					label: `${replacementBase}.context`,
					type: 'variable',
					info: this.$locale.baseText('codeNodeEditor.completer.selector.context'),
				},
			];

			if (this.mode === 'runOnceForAllItems') {
				options.push(
					{
						label: `${replacementBase}.first()`,
						type: 'function',
						info: this.$locale.baseText('codeNodeEditor.completer.$input.first'),
					},
					{
						label: `${replacementBase}.last()`,
						type: 'function',
						info: this.$locale.baseText('codeNodeEditor.completer.$input.last'),
					},
					{
						label: `${replacementBase}.all()`,
						type: 'function',
						info: this.$locale.baseText('codeNodeEditor.completer.$input.all'),
					},
					{
						label: `${replacementBase}.itemMatching()`,
						type: 'function',
						info: this.$locale.baseText('codeNodeEditor.completer.selector.itemMatching'),
					},
				);
			}

			if (this.mode === 'runOnceForEachItem') {
				options.push({
					label: `${replacementBase}.item`,
					type: 'variable',
					info: this.$locale.baseText('codeNodeEditor.completer.selector.item'),
				});
			}

			return {
				from: preCursor.from,
				options,
			};
		},
	},
});
