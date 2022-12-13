<template>
	<div ref="root" class="ph-no-capture" />
</template>

<script lang="ts">
import Vue, { PropType } from 'vue';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';

import { EXPRESSION_EDITOR_THEME } from './theme';
import { addColor, removeColor } from './colorDecorations';

import type { Plaintext, Resolved, Segment } from './types';

export default Vue.extend({
	name: 'expression-modal-output',
	props: {
		segments: {
			type: Array as PropType<Segment[]>,
		},
	},
	watch: {
		segments() {
			if (!this.editor) return;

			this.editor.dispatch({
				changes: { from: 0, to: this.editor.state.doc.length, insert: this.resolvedExpression },
			});

			addColor(this.editor, this.resolvedSegments);
			removeColor(this.editor, this.plaintextSegments);
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
			EditorState.readOnly.of(true),
			EditorView.lineWrapping,
		];

		this.editor = new EditorView({
			parent: this.$refs.root as HTMLDivElement,
			state: EditorState.create({
				doc: this.resolvedExpression,
				extensions,
			}),
		});
	},
	destroyed() {
		this.editor?.destroy();
	},
	computed: {
		resolvedExpression(): string {
			return this.segments.reduce((acc, segment) => {
				acc += segment.kind === 'resolvable' ? segment.resolved : segment.plaintext;
				return acc;
			}, '');
		},
		plaintextSegments(): Plaintext[] {
			return this.segments.filter((s): s is Plaintext => s.kind === 'plaintext');
		},
		resolvedSegments(): Resolved[] {
			let cursor = 0;

			return this.segments
				.map((segment) => {
					segment.from = cursor;

					cursor +=
						segment.kind === 'plaintext'
							? segment.plaintext.length
							: (segment.resolved as any).toString().length;

					segment.to = cursor;

					return segment;
				})
				.filter((segment): segment is Resolved => segment.kind === 'resolvable');
		},
	},
	methods: {
		getValue() {
			return '=' + this.resolvedExpression;
		},
	},
});
</script>

<style lang="scss"></style>
