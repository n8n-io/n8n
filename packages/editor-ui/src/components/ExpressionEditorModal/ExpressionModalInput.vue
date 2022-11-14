<template>
	<div ref="root" class="ph-no-capture" />
</template>

<script lang="ts">
import mixins from 'vue-typed-mixins';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { history } from '@codemirror/commands';
import { autocompletion } from '@codemirror/autocomplete';
import { syntaxTree } from '@codemirror/language';

import { workflowHelpers } from '@/components/mixins/workflowHelpers';
import { n8nLanguageSupport } from './n8nLanguageSupport';
import { resolvableCompletions } from './resolvable.completions';
import { braceHandler } from './braceHandler';
import { EXPRESSION_EDITOR_THEME } from './theme';
import { addColor, removeColor } from './colorDecorations';

import type { IVariableItemSelected } from '@/Interface';
import type { RawSegment, Segment, Resolvable, Plaintext } from './types';

export default mixins(workflowHelpers).extend({
	name: 'ExpressionModalInput',
	props: {
		value: {
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
			braceHandler(),
			autocompletion({ override: [resolvableCompletions] }),
			EditorView.lineWrapping,
			EditorState.transactionFilter.of((tx) => (tx.newDoc.lines > 1 ? [] : tx)), // forbid newlines
			EditorView.updateListener.of((viewUpdate) => {
				if (!this.editor || !viewUpdate.docChanged) return;

				removeColor(this.editor, this.plaintextSegments);

				addColor(this.editor, this.resolvableSegments);

				this.$emit('change', { value: this.unresolvedExpression, segments: this.segments });
			}),
		];

		this.editor = new EditorView({
			parent: this.$refs.root as HTMLDivElement,
			state: EditorState.create({
				doc: this.value.startsWith('=') ? this.value.slice(1) : this.value,
				extensions,
			}),
		});

		addColor(this.editor, this.resolvableSegments);

		this.$emit('change', { value: this.unresolvedExpression, segments: this.segments });
	},
	destroyed() {
		this.editor?.destroy();
	},
	computed: {
		unresolvedExpression(): string {
			return this.segments.reduce((acc, segment) => {
				acc += segment.kind === 'resolvable' ? segment.resolvable : segment.plaintext;

				return acc;
			}, '=');
		},
		resolvableSegments(): Resolvable[] {
			return this.segments.filter((s): s is Resolvable => s.kind === 'resolvable');
		},
		plaintextSegments(): Plaintext[] {
			return this.segments.filter((s): s is Plaintext => s.kind === 'plaintext');
		},
		segments(): Segment[] {
			if (!this.editor) return [];

			const rawInputSegments: RawSegment[] = [];

			syntaxTree(this.editor.state)
				.cursor()
				.iterate((node) => {
					if (!this.editor || node.type.name === 'Program') return;

					rawInputSegments.push({
						from: node.from,
						to: node.to,
						text: this.editor.state.sliceDoc(node.from, node.to),
						type: node.type.name,
					});
				});

			return rawInputSegments.reduce<Segment[]>((acc, segment) => {
				const { from, to, text, type } = segment;

				if (type === 'Resolvable') {
					const { resolved, error } = this.resolve(text);

					acc.push({ kind: 'resolvable', from, to, resolvable: text, resolved, error });

					return acc;
				}

				// broken resolvable included in plaintext

				acc.push({ kind: 'plaintext', from, to, plaintext: text });

				return acc;
			}, []);
		},
	},
	methods: {
		// @TODO: Temp error handling
		resolve(resolvable: string) {
			const result: { resolved: unknown; error: boolean } = { resolved: undefined, error: false };

			try {
				result.resolved = this.resolveExpression('=' + resolvable) as unknown;
			} catch (error) {
				result.resolved = `[failed to resolve due to: ${error.message}]`;
				result.error = true;
			}

			if (result.resolved === '') {
				result.resolved = '[empty]';
			}

			if (result.resolved === undefined && /\{\{\s*\}\}/.test(resolvable)) {
				result.resolved = '[empty]';
			}

			if (result.resolved === undefined) {
				result.resolved = '[undefined]';
				result.error = true;
			}

			if (result.resolved === '[Object: null]') {
				result.resolved = '[null]';
				result.error = true;
			}

			return result;
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

<style lang="scss"></style>
