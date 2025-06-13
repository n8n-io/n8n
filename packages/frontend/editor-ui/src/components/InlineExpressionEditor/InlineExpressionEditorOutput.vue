<script setup lang="ts">
import type { EditorState, SelectionRange } from '@codemirror/state';

import { useI18n } from '@n8n/i18n';
import { useNDVStore } from '@/stores/ndv.store';
import type { Segment } from '@/types/expressions';
import { onBeforeUnmount } from 'vue';
import ExpressionOutput from './ExpressionOutput.vue';
import OutputItemSelect from './OutputItemSelect.vue';
import InlineExpressionTip from './InlineExpressionTip.vue';
import { outputTheme } from './theme';

interface InlineExpressionEditorOutputProps {
	segments: Segment[];
	unresolvedExpression?: string;
	editorState?: EditorState;
	selection?: SelectionRange;
	visible?: boolean;
	isReadOnly?: boolean;
}

withDefaults(defineProps<InlineExpressionEditorOutputProps>(), {
	visible: false,
	editorState: undefined,
	selection: undefined,
	isReadOnly: false,
	unresolvedExpression: undefined,
});

const i18n = useI18n();
const theme = outputTheme();
const ndvStore = useNDVStore();

onBeforeUnmount(() => {
	ndvStore.expressionOutputItemIndex = 0;
});
</script>

<template>
	<div v-if="visible" :class="$style.dropdown" title="">
		<div :class="$style.header">
			<n8n-text bold size="small" compact>
				{{ i18n.baseText('parameterInput.result') }}
			</n8n-text>

			<OutputItemSelect />
		</div>
		<n8n-text :class="$style.body">
			<ExpressionOutput
				data-test-id="inline-expression-editor-output"
				:segments="segments"
				:extensions="theme"
			>
			</ExpressionOutput>
		</n8n-text>
		<div v-if="!isReadOnly" :class="$style.footer">
			<InlineExpressionTip
				:editor-state="editorState"
				:selection="selection"
				:unresolved-expression="unresolvedExpression"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
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

	.body {
		padding: var(--spacing-3xs);
	}

	.footer {
		border-top: var(--border-base);
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--spacing-2xs);
		color: var(--color-text-dark);
		font-weight: var(--font-weight-bold);
		padding: 0 var(--spacing-2xs);
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
