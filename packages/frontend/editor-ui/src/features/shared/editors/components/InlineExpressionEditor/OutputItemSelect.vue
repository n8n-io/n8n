<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { injectNDVStore } from '@/features/ndv/shared/ndv.store';
import { computed } from 'vue';

import { N8nIconButton, N8nInputNumber, N8nText, N8nTooltip } from '@n8n/design-system';
const i18n = useI18n();
const ndvStore = injectNDVStore();

const hoveringItem = computed(() => ndvStore.value.getHoveringItem);
const hoveringItemIndex = computed(() => hoveringItem.value?.itemIndex);
const isHoveringItem = computed(() => Boolean(hoveringItem.value));
const itemsLength = computed(() => ndvStore.value.ndvInputDataWithPinnedData.length);
const itemIndex = computed(
	() => hoveringItemIndex.value ?? ndvStore.value.expressionOutputItemIndex ?? 0,
);
const max = computed(() => Math.max(itemsLength.value - 1, 0));
const isItemIndexEditable = computed(() => !isHoveringItem.value && itemsLength.value > 0);
const hideTableHoverHint = computed(() => ndvStore.value.isTableHoverOnboarded);
const canSelectPrevItem = computed(() => isItemIndexEditable.value && itemIndex.value !== 0);
const canSelectNextItem = computed(
	() => isItemIndexEditable.value && itemIndex.value < itemsLength.value - 1,
);

const inputCharWidth = computed(() => itemIndex.value.toString().length);
const inputWidth = computed(() => `calc(${inputCharWidth.value}ch + var(--spacing--sm))`);

function updateItemIndex(index: number) {
	ndvStore.value.expressionOutputItemIndex = index;
}

function nextItem() {
	ndvStore.value.expressionOutputItemIndex = ndvStore.value.expressionOutputItemIndex + 1;
}

function prevItem() {
	ndvStore.value.expressionOutputItemIndex = ndvStore.value.expressionOutputItemIndex - 1;
}
</script>

<template>
	<div :class="$style.item">
		<N8nText size="small" color="text-base" compact>
			{{ i18n.baseText('parameterInput.item') }}
		</N8nText>

		<div :class="$style.controls">
			<N8nInputNumber
				data-test-id="inline-expression-editor-item-input"
				size="mini"
				:controls="false"
				:class="[$style.input, { [$style.hovering]: isHoveringItem }]"
				:min="0"
				:max="max"
				:model-value="itemIndex"
				:style="{ width: inputWidth, maxWidth: inputWidth, minWidth: inputWidth }"
				@update:model-value="updateItemIndex"
			></N8nInputNumber>
			<N8nIconButton
				variant="ghost"
				data-test-id="inline-expression-editor-item-prev"
				icon="chevron-left"
				size="xsmall"
				:disabled="!canSelectPrevItem"
				@click="prevItem"
			></N8nIconButton>

			<N8nTooltip placement="right" :disabled="hideTableHoverHint">
				<template #content>
					<div>{{ i18n.baseText('parameterInput.hoverTableItemTip') }}</div>
				</template>
				<N8nIconButton
					variant="ghost"
					data-test-id="inline-expression-editor-item-next"
					icon="chevron-right"
					size="xsmall"
					:disabled="!canSelectNextItem"
					@click="nextItem"
				></N8nIconButton>
			</N8nTooltip>
		</div>
	</div>
</template>

<style lang="scss" module>
.item {
	display: flex;
	align-items: center;
	flex-shrink: 0;
	gap: var(--spacing--4xs);
}

.controls {
	display: flex;
	align-items: center;
	flex-shrink: 0;
}

.controls .input {
	--input--height: 22px;
	--input--radius--top-left: var(--radius);
	--input--radius--bottom-left: var(--radius);
	--input-triple--radius--top-right: var(--radius);
	--input-triple--radius--bottom-right: var(--radius);
	--input--padding: var(--spacing--4xs);
	flex: 0 0 auto;
	box-sizing: border-box;
	line-height: calc(var(--input--height) - var(--spacing--4xs));

	&.hovering {
		--input--color--text: var(--color--secondary);
	}

	:global(input) {
		text-align: center;
	}
}
</style>
