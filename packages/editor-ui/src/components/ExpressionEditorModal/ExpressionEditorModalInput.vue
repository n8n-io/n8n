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
import { bracketMatching } from '@codemirror/language';
import { autocompletion } from '@codemirror/autocomplete';

import { genericHelpers } from '@/components/mixins/genericHelpers'; // @TODO: Needed?
import { workflowHelpers } from '@/components/mixins/workflowHelpers'; // @TODO: Needed?
import { n8nLanguageSupport } from './n8nLanguageSupport';
import { resolvableCompletions } from './resolvable.completions';
import { EXPRESSION_EDITOR_THEME } from './theme';

import type { PropType } from 'vue';
import type { INodeProperties } from 'n8n-workflow';

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
		resolvedValue: {
			type: String, // @TODO: Confirm
		},
	},
	data() {
		return {
			editor: null as EditorView | null,
		};
	},
	watch: {
		value() {
			if (!this.resolvedValue) return;

			this.onNewValue();
		},
	},
	mounted() {
		const docValue = this.value.startsWith('=') ? this.value.slice(1) : this.value;
		const rootElement = this.$refs.expressionEditorModalInput as HTMLDivElement;

		const extensions = [
			EXPRESSION_EDITOR_THEME,
			n8nLanguageSupport(),
			bracketMatching(), // highlight pair
			history(),
			autocompletion({ override: [resolvableCompletions] }),
			EditorState.transactionFilter.of((tx) => tx.newDoc.lines > 1 ? [] : tx),
		];

		this.editor = new EditorView({
			parent: rootElement,
			state: EditorState.create({ doc: docValue, extensions }),
		});
	},
	methods: {
		onNewValue() {
			// @TODO
		},
		extractResolvables() {
			// @TODO
		},
		resolve() {
			// @TODO
		},
		colorResolvables() {
			// @TODO
		},
	},
});
</script>

<style lang="scss">
.resolvable {
	background-color: yellow;
	color: black;
}
</style>
