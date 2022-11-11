<template>
	<div>
		<div ref="expressionEditorModalInput" class="ph-no-capture" />
	</div>
</template>

<script lang="ts">
import mixins from 'vue-typed-mixins';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { history } from '@codemirror/commands';
import { autocompletion } from '@codemirror/autocomplete';
import { syntaxTree } from '@codemirror/language';

import { genericHelpers } from '@/components/mixins/genericHelpers'; // @TODO: Needed?
import { workflowHelpers } from '@/components/mixins/workflowHelpers'; // @TODO: Needed?
import { n8nLanguageSupport } from './n8nLanguageSupport';
import { resolvableCompletions } from './resolvable.completions';
import { EXPRESSION_EDITOR_THEME } from './theme';

import type { PropType } from 'vue';
import type { INodeProperties } from 'n8n-workflow';
import type { IVariableItemSelected } from '@/Interface';

export default mixins(genericHelpers, workflowHelpers).extend({
	name: 'ExpressionEditorModalInput',
	props: {
		value: {
			type: String,
		},
		parameter: {
			type: Object as PropType<INodeProperties>,
		},
		path: {
			type: String,
		},
	},
	data() {
		return {
			editor: null as EditorView | null,
		};
	},
	mounted() {
		const extensions = [
			EXPRESSION_EDITOR_THEME,
			n8nLanguageSupport(),
			history(),
			autocompletion({ override: [resolvableCompletions] }),
			EditorState.transactionFilter.of((tx) => (tx.newDoc.lines > 1 ? [] : tx)),
			EditorView.updateListener.of((viewUpdate) => {
				if (!this.editor || !viewUpdate.docChanged) return;

				const payload = '=' + this.editor.state.doc.toString();

				this.$emit('input', payload);
				this.$emit('change', payload);
			}),
		];

		this.editor = new EditorView({
			parent: this.$refs.expressionEditorModalInput as HTMLDivElement,
			state: EditorState.create({
				doc: this.value.startsWith('=') ? this.value.slice(1) : this.value,
				extensions,
			}),
		});

		const segments = this.parseSegments();

		// @TODO: Color resolvable segments based on result
	},
	methods: {
		parseSegments() {
			if (!this.editor) return [];

			const rawSegments: string[] = [];

			syntaxTree(this.editor.state)
				.cursor()
				.iterate((node) => {
					if (!this.editor) return;

					if (node.from === 0 && node.to === this.editor.state.doc.length) return;

					rawSegments.push(this.editor.state.sliceDoc(node.from, node.to));
				});

			type ParsedSegment = { plaintext: string } | { resolvable: string; resolved: any }; // @TODO: Improve typing

			return rawSegments.reduce<ParsedSegment[]>((acc, segment) => {
				if (segment.startsWith('{{') && segment.endsWith('}}')) {
					acc.push({ resolvable: segment, resolved: this.resolve(segment) });
					return acc;
				}

				acc.push({ plaintext: segment });
				return acc;
			}, []);
		},
		resolve(resolvable: string) {
			let returnValue;

			// @TODO: Refine error handling

			try {
				returnValue = this.resolveExpression('=' + resolvable) as unknown;
			} catch (error) {
				return `[failed to resolve due to: ${error.message}]`;
			}

			if (returnValue === undefined) {
				return '[resolved to undefined]';
			}

			return returnValue;
		},
		itemSelected({ variable }: IVariableItemSelected) {
			if (!this.editor) return;

			this.editor.dispatch({
				changes: {
					from: this.editor.state.selection.main.head,
					insert: `{{ ${variable} }}`,
				},
			});
		},
	},
});
</script>

<style lang="scss">
.resolvable {
	background-color: yellow;
	color: black;

	&.valid {
		background-color: green;
	}

	&.invalid {
		background-color: red;
	}
}
</style>
