<template>
	<div ref="root" class="ph-no-capture"></div>
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
	data() {
		return {
			editor: null as EditorView | null,
		};
	},
	mounted() {
		const extensions = [
			outputTheme(),
			EditorState.readOnly.of(true),
			EditorView.lineWrapping,
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
							: // eslint-disable-next-line @typescript-eslint/no-explicit-any
							segment.resolved
							? (segment.resolved as any).toString().length
							: 0;

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
