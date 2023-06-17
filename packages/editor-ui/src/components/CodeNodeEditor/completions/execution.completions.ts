import Vue from 'vue';
import { addVarType, escape } from '../utils';
import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import type { CodeNodeEditorMixin } from '../types';

export const executionCompletions = (Vue as CodeNodeEditorMixin).extend({
	methods: {
		/**
		 * Complete `$execution.` to `.id .mode .resumeUrl`
		 */
		executionCompletions(
			context: CompletionContext,
			matcher = '$execution',
		): CompletionResult | null {
			const pattern = new RegExp(`${escape(matcher)}\..*`);

			const preCursor = context.matchBefore(pattern);

			if (!preCursor || (preCursor.from === preCursor.to && !context.explicit)) return null;

			const buildLinkNode = (text: string) => {
				const wrapper = document.createElement('span');
				// This is being loaded from the locales file. This could
				// cause an XSS of some kind but multiple other locales strings
				// do the same thing.
				wrapper.innerHTML = text;
				return () => wrapper;
			};

			const options: Completion[] = [
				{
					label: `${matcher}.id`,
					info: this.$locale.baseText('codeNodeEditor.completer.$execution.id'),
				},
				{
					label: `${matcher}.mode`,
					info: this.$locale.baseText('codeNodeEditor.completer.$execution.mode'),
				},
				{
					label: `${matcher}.resumeUrl`,
					info: this.$locale.baseText('codeNodeEditor.completer.$execution.resumeUrl'),
				},
				{
					label: `${matcher}.customData.set("key", "value")`,
					info: buildLinkNode(
						this.$locale.baseText('codeNodeEditor.completer.$execution.customData.set()'),
					),
				},
				{
					label: `${matcher}.customData.get("key")`,
					info: buildLinkNode(
						this.$locale.baseText('codeNodeEditor.completer.$execution.customData.get()'),
					),
				},
				{
					label: `${matcher}.customData.setAll({})`,
					info: buildLinkNode(
						this.$locale.baseText('codeNodeEditor.completer.$execution.customData.setAll()'),
					),
				},
				{
					label: `${matcher}.customData.getAll()`,
					info: buildLinkNode(
						this.$locale.baseText('codeNodeEditor.completer.$execution.customData.getAll()'),
					),
				},
			];

			return {
				from: preCursor.from,
				options: options.map(addVarType),
			};
		},
	},
});
