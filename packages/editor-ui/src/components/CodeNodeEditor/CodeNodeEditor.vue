<template>
	<div ref="codeNodeEditor" />
</template>

<script lang="ts">
import mixins from 'vue-typed-mixins';

import { EditorState } from '@codemirror/state';
import { EditorView, ViewUpdate } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';

import { PLACEHOLDERS } from './placeholders';
import { CODE_NODE_THEME } from './theme';
import { BASE_EXTENSIONS } from './baseExtensions';
import { linterExtension } from './linter';

export default mixins(linterExtension).extend({
	name: 'CodeNodeEditor',
	props: {
		mode: {
			type: String,
			validator: (value: string): boolean =>
				['runOnceForAllItems', 'runOnceForEachItem'].includes(value),
		},
		isReadOnly: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		return {
			editor: null as EditorView | null,
		};
	},
	watch: {
		mode() {
			this.refreshPlaceholder();
		},
	},
	computed: {
		placeholder(): string {
			return {
				runOnceForAllItems: PLACEHOLDERS.ALL_ITEMS,
				runOnceForEachItem: PLACEHOLDERS.EACH_ITEM,
			}[this.mode];
		},
		previousPlaceholder(): string {
			return {
				runOnceForAllItems: PLACEHOLDERS.EACH_ITEM,
				runOnceForEachItem: PLACEHOLDERS.ALL_ITEMS,
			}[this.mode];
		},
	},
	methods: {
		refreshPlaceholder() {
			if (!this.editor) return;

			const content = this.editor.state.doc.toString();

			if (!content || content === this.previousPlaceholder) {
				this.editor.dispatch({
					changes: { from: 0, to: content.length, insert: this.placeholder },
				});
			}
		},
		notifyChange() {
			if (!this.editor) return;

			this.$emit('valueChanged', this.editor.state.doc.toString());
		},
	},
	mounted() {
		const STATE_BASED_EXTENSIONS = [
			this.linterExtension(),
			EditorState.readOnly.of(this.isReadOnly),
			EditorView.updateListener.of((viewUpdate: ViewUpdate) => {
				if (viewUpdate.docChanged) this.notifyChange();
			}),
		];

		this.editor = new EditorView({
			state: EditorState.create({
				doc: this.placeholder, // @TODO: Prevent user content overwrite
				extensions: [...BASE_EXTENSIONS, ...STATE_BASED_EXTENSIONS, CODE_NODE_THEME, javascript()],
			}),
			parent: this.$refs.codeNodeEditor as HTMLDivElement,
		});

		this.notifyChange();
	},
});
</script>

<style lang="scss" scoped></style>
