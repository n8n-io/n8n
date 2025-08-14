<script setup lang="ts">
import type { EditorState, SelectionRange } from '@codemirror/state';

import { useI18n } from '@n8n/i18n';
import { useNDVStore } from '@/stores/ndv.store';
import type { Segment } from '@/types/expressions';
import { computed, onBeforeUnmount, useTemplateRef } from 'vue';
import ExpressionOutput from './ExpressionOutput.vue';
import OutputItemSelect from './OutputItemSelect.vue';
import InlineExpressionTip from './InlineExpressionTip.vue';
import { outputTheme } from './theme';
import { useElementSize } from '@vueuse/core';
import { N8nPopover } from '@n8n/design-system';

interface InlineExpressionEditorOutputProps {
	segments: Segment[];
	unresolvedExpression?: string;
	editorState?: EditorState;
	selection?: SelectionRange;
	isReadOnly?: boolean;
	visible: boolean;
	virtualRef?: HTMLElement;
	appendTo?: string;
}

const props = withDefaults(defineProps<InlineExpressionEditorOutputProps>(), {
	editorState: undefined,
	selection: undefined,
	isReadOnly: false,
	unresolvedExpression: undefined,
});

const i18n = useI18n();
const theme = outputTheme();
const ndvStore = useNDVStore();
const contentRef = useTemplateRef('content');
const virtualRefSize = useElementSize(computed(() => props.virtualRef));

onBeforeUnmount(() => {
	ndvStore.expressionOutputItemIndex = 0;
});

defineExpose({
	contentRef,
});
</script>

<template>
	<N8nPopover
		:visible="visible"
		placement="bottom"
		:show-arrow="false"
		:offset="0"
		:persistent="false"
		:virtual-triggering="virtualRef !== undefined"
		:virtual-ref="virtualRef"
		:width="virtualRefSize.width.value"
		:popper-class="$style.popper"
		:popper-options="{
			modifiers: [
				{ name: 'flip', enabled: false },
				{
					// Ensures that the popover is re-positioned when the reference element is resized
					name: 'custom modifier',
					options: {
						width: virtualRefSize.width.value,
						height: virtualRefSize.height.value,
					},
				},
			],
		}"
		:append-to="appendTo"
	>
		<div ref="content" :class="$style.dropdown">
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
	</N8nPopover>
</template>

<style lang="scss" module>
.popper {
	background-color: transparent !important;
	padding: 0 !important;
	border: none !important;
}

.dropdown {
	display: flex;
	flex-direction: column;
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
		padding-top: 0;
		padding-left: var(--spacing-2xs);
		color: var(--color-text-dark);

		&:first-child {
			padding-top: var(--spacing-2xs);
		}
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
}
</style>
