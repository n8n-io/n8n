<template>
	<div ref="root"></div>
</template>

<script lang="ts">
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defineComponent } from 'vue';
import type { PropType } from 'vue';

import { highlighter } from '@/plugins/codemirror/resolvableHighlighter';
import { outputTheme } from './theme';

import type { Plaintext, Resolved, Segment } from '@/types/expressions';
import { forceParse } from '@/utils/forceParse';

export default defineComponent({
	name: 'ExpressionEditorModalOutput',
	props: {
		segments: {
			type: Array as PropType<Segment[]>,
			required: true,
		},
	},
	data() {
		return {
			editor: null as EditorView | null,
		};
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
							: segment.resolved
								? segment.resolved.toString().length
								: 0;

					segment.to = cursor;

					return segment;
				})
				.filter((segment): segment is Resolved => segment.kind === 'resolvable');
		},
	},
	watch: {
		segments() {
			if (!this.editor) return;

			this.editor.dispatch({
				changes: { from: 0, to: this.editor.state.doc.length, insert: this.resolvedExpression },
			});

			highlighter.addColor(this.editor, this.resolvedSegments);
			highlighter.removeColor(this.editor, this.plaintextSegments);
		},
	},
	mounted() {
		const extensions = [
			outputTheme(),
			EditorState.readOnly.of(true),
			EditorView.lineWrapping,
			EditorView.editable.of(false),
			EditorView.domEventHandlers({ scroll: forceParse }),
		];

		this.editor = new EditorView({
			parent: this.$refs.root as HTMLDivElement,
			state: EditorState.create({
				doc: this.resolvedExpression,
				extensions,
			}),
		});
	},
	beforeUnmount() {
		this.editor?.destroy();
	},
	methods: {
		getValue() {
			return '=' + this.resolvedExpression;
		},
	},
});
</script>

<style lang="scss"></style>
