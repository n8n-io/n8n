<template>
	<div>
		<div ref="expressionModalOutput" class="ph-no-capture" />
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { EXPRESSION_EDITOR_THEME } from './theme';

export default Vue.extend({
	name: 'ExpressionModalOutput',
	props: {
		output: {
			type: String,
		},
	},
	watch: {
		output() {
			if (!this.editor) return;

			this.editor.dispatch({
				changes: { from: 0, to: this.editor.state.doc.length, insert: this.output },
			});
		},
	},
	data() {
		return {
			editor: null as EditorView | null,
		};
	},
	mounted() {
		this.editor = new EditorView({
			parent: this.$refs.expressionModalOutput as HTMLDivElement,
			state: EditorState.create({
				doc: this.output.startsWith('=') ? this.output.slice(1) : this.output,
				extensions: [EXPRESSION_EDITOR_THEME, EditorState.readOnly.of(true)],
			}),
		});
	},
	destroyed() {
		this.editor?.destroy();
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
