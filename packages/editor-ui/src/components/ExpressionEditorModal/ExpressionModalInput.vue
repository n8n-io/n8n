<template>
	<div>
		<div ref="expressionModalInput" class="ph-no-capture" />
	</div>
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

import type { IVariableItemSelected } from '@/Interface';

type ParsedSegment =
	| { plaintext: string }
	| { resolvable: string; resolved: unknown; error: boolean };

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
			EditorState.transactionFilter.of((tx) => (tx.newDoc.lines > 1 ? [] : tx)),
			EditorView.updateListener.of((viewUpdate) => {
				if (!this.editor || !viewUpdate.docChanged) return;

				this.$emit('change', this.getDisplayOutput());
			}),
		];

		this.editor = new EditorView({
			parent: this.$refs.expressionModalInput as HTMLDivElement,
			state: EditorState.create({
				doc: this.value.startsWith('=') ? this.value.slice(1) : this.value,
				extensions,
			}),
		});
	},
	destroyed() {
		this.editor?.destroy();
	},
	methods: {
		getDisplayOutput(): string {
			return this.parseSegments().reduce((acc, segment) => {
				if ('resolved' in segment) acc += segment.resolved;
				if ('plaintext' in segment) acc += segment.plaintext;

				return acc;
			}, '');
		},
		parseSegments() {
			if (!this.editor) return [];

			const rawSegments: string[] = [];

			syntaxTree(this.editor.state)
				.cursor()
				.iterate((node) => {
					if (!this.editor || node.type.name === 'Program') return;

					rawSegments.push(this.editor.state.sliceDoc(node.from, node.to));
				});

			return rawSegments.reduce<ParsedSegment[]>((acc, segment) => {
				if (segment.startsWith('{{') && segment.endsWith('}}')) {
					const { resolved, error } = this.resolve(segment);
					acc.push({ resolvable: segment, resolved, error });
					return acc;
				}

				acc.push({ plaintext: segment });
				return acc;
			}, []);
		},
		// @TODO: Refine error handling
		resolve(resolvable: string) {
			const result: { resolved: unknown; error: boolean } = { resolved: undefined, error: false };

			try {
				result.resolved = this.resolveExpression('=' + resolvable) as unknown;
			} catch (error) {
				result.resolved = `[failed to resolve due to: ${error.message}]`;
				result.error = true;
			}

			if (result.resolved === undefined && /\{\{\s*\}\}/.test(resolvable)) {
				result.resolved = '[empty]';
			}

			if (result.resolved === undefined) {
				result.resolved = '[resolved to undefined]';
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
