<script setup lang="ts">
import type { EditorState, SelectionRange } from '@codemirror/state';

import { useI18n } from '@/composables/useI18n';
import type { Segment } from '@/types/expressions';
import ExpressionOutput from './ExpressionOutput.vue';
import InlineExpressionTip from './InlineExpressionTip.vue';
import { outputTheme } from './theme';
import { computed, onBeforeUnmount } from 'vue';
import { useNDVStore } from '@/stores/ndv.store';

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

const hoveringItem = computed(() => ndvStore.getHoveringItem);
const hoveringItemIndex = computed(() => hoveringItem.value?.itemIndex);
const isHoveringItem = computed(() => Boolean(hoveringItem.value));
const itemsLength = computed(() => ndvStore.ndvInputDataWithPinnedData.length);
const isItemSelectable = computed(() => !isHoveringItem.value && itemsLength.value > 1);

const itemIndex = computed(() => hoveringItemIndex.value ?? ndvStore.expressionOutputItemIndex);
const itemNumber = computed(() => (itemIndex.value + 1).toString());
const canSelectPrevItem = computed(
	() => !isHoveringItem.value && ndvStore.expressionOutputItemIndex > 0,
);
const canSelectNextItem = computed(
	() => !isHoveringItem.value && ndvStore.expressionOutputItemIndex < itemsLength.value - 1,
);

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
	<div :class="visible ? $style.dropdown : $style.hidden">
		<div :class="$style.header">
			<n8n-text bold size="small" compact>
				{{ i18n.baseText('parameterInput.result') }}
			</n8n-text>
			<div v-if="isItemSelectable" :class="$style.item">
				<n8n-icon color="text-base" icon="eye" size="small" />
				<n8n-text size="small" color="text-base" compact>
					{{
						i18n.baseText('parameterInput.itemN', {
							interpolate: { num: itemNumber },
						})
					}}
				</n8n-text>
				<div>
					<n8n-icon-button
						text
						type="tertiary"
						icon="chevron-left"
						size="mini"
						:disabled="!canSelectPrevItem"
						@click="prevItem"
					/>
					<n8n-icon-button
						text
						type="tertiary"
						icon="chevron-right"
						size="mini"
						:disabled="!canSelectNextItem"
						@click="nextItem"
					/>
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
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--spacing-2xs);
		min-height: 36px;
		color: var(--color-text-dark);
		font-weight: var(--font-weight-bold);
		padding-left: var(--spacing-2xs);
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
}
</style>
