<script setup lang="ts">
import type { EditorState, SelectionRange } from '@codemirror/state';

import { useI18n } from '@/composables/useI18n';
import type { Segment } from '@/types/expressions';
import ExpressionOutput from './ExpressionOutput.vue';
import InlineExpressionTip from './InlineExpressionTip.vue';
import { outputTheme } from './theme';
import { computed, onBeforeUnmount } from 'vue';
import { useNDVStore } from '@/stores/ndv.store';
import { N8nTooltip } from 'n8n-design-system/components';

interface InlineExpressionEditorOutputProps {
	segments: Segment[];
	unresolvedExpression?: string;
	editorState?: EditorState;
	selection?: SelectionRange;
	visible?: boolean;
}

withDefaults(defineProps<InlineExpressionEditorOutputProps>(), {
	visible: false,
	editorState: undefined,
	selection: undefined,
	unresolvedExpression: undefined,
});

const i18n = useI18n();
const theme = outputTheme();
const ndvStore = useNDVStore();

const hideTableHoverHint = computed(() => ndvStore.isTableHoverOnboarded);
const hoveringItem = computed(() => ndvStore.getHoveringItem);
const hoveringItemIndex = computed(() => hoveringItem.value?.itemIndex);
const isHoveringItem = computed(() => Boolean(hoveringItem.value));
const itemsLength = computed(() => ndvStore.ndvInputDataWithPinnedData.length);
const itemIndex = computed(() => hoveringItemIndex.value ?? ndvStore.expressionOutputItemIndex);
const max = computed(() => Math.max(itemsLength.value - 1, 0));
const isItemIndexEditable = computed(() => !isHoveringItem.value && itemsLength.value > 0);
const canSelectPrevItem = computed(() => isItemIndexEditable.value && itemIndex.value !== 0);
const canSelectNextItem = computed(
	() => isItemIndexEditable.value && itemIndex.value < itemsLength.value - 1,
);

function updateItemIndex(index: number) {
	ndvStore.expressionOutputItemIndex = index;
}

function nextItem() {
	ndvStore.expressionOutputItemIndex = ndvStore.expressionOutputItemIndex + 1;
}

function prevItem() {
	ndvStore.expressionOutputItemIndex = ndvStore.expressionOutputItemIndex - 1;
}

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

			<div :class="$style.item">
				<n8n-text size="small" color="text-base" compact>
					{{ i18n.baseText('parameterInput.item') }}
				</n8n-text>

				<div :class="$style.controls">
					<N8nInputNumber
						data-test-id="inline-expression-editor-item-input"
						size="mini"
						:controls="false"
						:class="[$style.input, { [$style.hovering]: isHoveringItem }]"
						:min="0"
						:max="max"
						:model-value="itemIndex"
						@update:model-value="updateItemIndex"
					></N8nInputNumber>
					<N8nIconButton
						data-test-id="inline-expression-editor-item-prev"
						icon="chevron-left"
						type="tertiary"
						text
						size="mini"
						:disabled="!canSelectPrevItem"
						@click="prevItem"
					></N8nIconButton>

					<N8nTooltip placement="right" :disabled="hideTableHoverHint">
						<template #content>
							<div>{{ i18n.baseText('parameterInput.hoverTableItemTip') }}</div>
						</template>
						<N8nIconButton
							data-test-id="inline-expression-editor-item-next"
							icon="chevron-right"
							type="tertiary"
							text
							size="mini"
							:disabled="!canSelectNextItem"
							@click="nextItem"
						></N8nIconButton>
					</N8nTooltip>
				</div>
			</div>
		</div>
		<n8n-text :class="$style.body">
			<ExpressionOutput
				data-test-id="inline-expression-editor-output"
				:segments="segments"
				:extensions="theme"
			>
			</ExpressionOutput>
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

	.item {
		display: flex;
		align-items: center;
		gap: var(--spacing-4xs);
	}

	.body {
		padding-top: 0;
		padding-left: var(--spacing-2xs);
		color: var(--color-text-dark);

		&:first-child {
			padding-top: var(--spacing-2xs);
		}
	}

	.controls {
		display: flex;
		align-items: center;
	}

	.input {
		--input-height: 22px;
		--input-width: 26px;
		--input-border-top-left-radius: var(--border-radius-base);
		--input-border-bottom-left-radius: var(--border-radius-base);
		--input-border-top-right-radius: var(--border-radius-base);
		--input-border-bottom-right-radius: var(--border-radius-base);
		max-width: var(--input-width);
		line-height: calc(var(--input-height) - var(--spacing-4xs));

		&.hovering {
			--input-font-color: var(--color-secondary);
		}

		:global(.el-input__inner) {
			height: var(--input-height);
			min-height: var(--input-height);
			line-height: var(--input-height);
			text-align: center;
			padding: 0 var(--spacing-4xs);
		}
	}
}
</style>
