<template>
	<div :class="visible ? $style.dropdown : $style.hidden">
		<n8n-text v-if="!noInputData" size="small" compact :class="$style.header">
			{{ i18n.baseText('parameterInput.resultForItem') }} {{ hoveringItemNumber }}
		</n8n-text>
		<n8n-text :class="$style.body">
			<div ref="root" data-test-id="inline-expression-editor-output"></div>
		</n8n-text>
		<div :class="$style.footer">
			<n8n-text size="small" compact>
				{{ i18n.baseText('parameterInput.anythingInside') }}
			</n8n-text>
			<div :class="$style['expression-syntax-example']" v-text="`{{ }}`"></div>
			<n8n-text size="small" compact>
				{{ i18n.baseText('parameterInput.isJavaScript') }}
			</n8n-text>
			{{ ' ' }}
			<n8n-link
				:class="$style['learn-more']"
				size="small"
				underline
				theme="text"
				:to="expressionsDocsUrl"
			>
				{{ i18n.baseText('parameterInput.learnMore') }}
			</n8n-link>
		</div>
	</div>
</template>

<script lang="ts">
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';

import { defineComponent } from 'vue';
import type { PropType } from 'vue';

import { highlighter } from '@/plugins/codemirror/resolvableHighlighter';
import { outputTheme } from './theme';

import type { Plaintext, Resolved, Segment } from '@/types/expressions';
import { EXPRESSIONS_DOCS_URL } from '@/constants';
import { useI18n } from '@/composables/useI18n';

export default defineComponent({
	name: 'InlineExpressionEditorOutput',
	props: {
		segments: {
			type: Array as PropType<Segment[]>,
			required: true,
		},
		isReadOnly: {
			type: Boolean,
			default: false,
		},
		visible: {
			type: Boolean,
			default: false,
		},
		noInputData: {
			type: Boolean,
			default: false,
		},
		hoveringItemNumber: {
			type: Number,
			required: true,
		},
	},
	setup() {
		const i18n = useI18n();

		return {
			i18n,
		};
	},
	data() {
		return {
			editor: null as EditorView | null,
			expressionsDocsUrl: EXPRESSIONS_DOCS_URL,
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
		this.editor = new EditorView({
			parent: this.$refs.root as HTMLDivElement,
			state: EditorState.create({
				doc: this.resolvedExpression,
				extensions: [outputTheme(), EditorState.readOnly.of(true), EditorView.lineWrapping],
			}),
		});
	},
	beforeUnmount() {
		this.editor?.destroy();
	},
});
</script>

<style lang="scss" module>
.hidden {
	display: none;
}

.dropdown {
	display: flex;
	flex-direction: column;
	position: absolute;
	z-index: 2; // cover tooltips
	background: var(--color-code-background);
	border: var(--border-base);
	border-top: none;
	width: 100%;
	box-shadow: 0 2px 6px 0 rgba(#441c17, 0.1);
	border-bottom-left-radius: 4px;
	border-bottom-right-radius: 4px;

	:global(.cm-editor) {
		background-color: var(--color-code-background);
	}

	.header,
	.body,
	.footer {
		padding: var(--spacing-3xs);
	}

	.header {
		color: var(--color-text-dark);
		font-weight: var(--font-weight-bold);
		padding-left: var(--spacing-2xs);
		padding-top: var(--spacing-2xs);
	}

	.body {
		padding-top: 0;
		padding-left: var(--spacing-2xs);
		color: var(--color-text-dark);

		&:first-child {
			padding-top: var(--spacing-2xs);
		}
	}

	.footer {
		border-top: var(--border-base);
		padding: var(--spacing-4xs);
		padding-left: var(--spacing-2xs);
		padding-top: 0;
		line-height: var(--font-line-height-regular);
		color: var(--color-text-base);

		.expression-syntax-example {
			display: inline-block;
			font-size: var(--font-size-2xs);
			height: var(--font-size-m);
			background-color: var(--color-expression-syntax-example);
			margin-left: var(--spacing-5xs);
			margin-right: var(--spacing-5xs);
		}

		.learn-more {
			line-height: 1;
			white-space: nowrap;
		}
	}
}
</style>
