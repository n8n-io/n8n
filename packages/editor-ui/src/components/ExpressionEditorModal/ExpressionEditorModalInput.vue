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

import { syntaxTree } from '@codemirror/language';

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

			console.log('here');

			this.onNewValue();
		},
	},

	mounted() {
		const docValue = this.value.startsWith('=') ? this.value.slice(1) : this.value;
		const rootElement = this.$refs.expressionEditorModalInput as HTMLDivElement;

		const extensions = [
			EXPRESSION_EDITOR_THEME,
			n8nLanguageSupport(),
			history(),
			autocompletion({ override: [resolvableCompletions] }),
			EditorState.transactionFilter.of((tx) => (tx.newDoc.lines > 1 ? [] : tx)),
		];

		this.editor = new EditorView({
			parent: rootElement,
			state: EditorState.create({ doc: docValue, extensions }),
		});

		const segments = this.createSegments();

		// const [first, second] = document.querySelectorAll('.resolvable');

		// console.log(first.classList);

		// first.classList.add('valid');

		// console.log(first.classList);

		console.log(segments);
	},
	methods: {
		onNewValue() {
			// @TODO
		},
		createSegments() {
			if (!this.editor) return [];

			const rawSegments: string[] = [];

			syntaxTree(this.editor.state)
				.cursor()
				.iterate((node) => {
					if (!this.editor) return;

					if (node.from === 0 && node.to === this.editor.state.doc.length) return;

					rawSegments.push(this.editor.state.sliceDoc(node.from, node.to));
				});

			type ParsedSegment = { plaintext: string } | { resolvable: string; resolved: any }; // @TODO: Improve any

			const segmentNodes = rawSegments.reduce<ParsedSegment[]>((acc, segment) => {
				if (segment.startsWith('{{') && segment.endsWith('}}')) {
					return acc.push({ resolvable: segment, resolved: this.resolve(segment) }), acc;
				}

				return acc.push({ plaintext: segment }), acc;
			}, []);

			return segmentNodes;
		},
		resolve(resolvable: string) {
			let returnValue;

			try {
				returnValue = this.resolveExpression(`=${resolvable}`);
			} catch (error) {
				return `[failed to resolve due to: ${error.message}]`;
			}

			if (returnValue === undefined) {
				return '[resolved to undefined]';
			}

			return returnValue as any;
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
