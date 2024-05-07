<script setup lang="ts">
import type { EditorState, SelectionRange } from '@codemirror/state';

import { useI18n } from '@/composables/useI18n';
import type { Segment } from '@/types/expressions';
import ExpressionOutput from './ExpressionOutput.vue';
import InlineExpressionTip from './InlineExpressionTip.vue';
import { outputTheme } from './theme';

interface InlineExpressionEditorOutputProps {
	segments: Segment[];
	hoveringItemNumber: number;
	unresolvedExpression?: string;
	editorState?: EditorState;
	selection?: SelectionRange;
	visible?: boolean;
	noInputData?: boolean;
}

withDefaults(defineProps<InlineExpressionEditorOutputProps>(), {
	visible: false,
	noInputData: false,
	editorState: undefined,
	selection: undefined,
	unresolvedExpression: undefined,
});

const i18n = useI18n();
const theme = outputTheme();
</script>

<template>
	<div :class="visible ? $style.dropdown : $style.hidden">
		<n8n-text v-if="!noInputData" size="small" compact :class="$style.header">
			{{ i18n.baseText('parameterInput.resultForItem') }} {{ hoveringItemNumber }}
		</n8n-text>
		<n8n-text :class="$style.body">
			<ExpressionOutput
				data-test-id="inline-expression-editor-output"
				:segments="segments"
				:extensions="theme"
			></ExpressionOutput>
		</n8n-text>
		<div :class="$style.footer">
			<InlineExpressionTip
				:editor-state="editorState"
				:selection="selection"
				:unresolved-expression="unresolvedExpression"
			/>
		</div>
	</div>
</template>

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
	.body {
		padding: var(--spacing-3xs);
	}

	.footer {
		border-top: var(--border-base);
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
}
</style>
