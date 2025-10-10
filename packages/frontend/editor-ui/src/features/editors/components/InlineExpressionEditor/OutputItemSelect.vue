<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { useNDVStore } from '@/stores/ndv.store';
import { computed } from 'vue';

import { N8nIconButton, N8nInputNumber, N8nText, N8nTooltip } from '@n8n/design-system';
const i18n = useI18n();
const ndvStore = useNDVStore();

const hoveringItem = computed(() => ndvStore.getHoveringItem);
const hoveringItemIndex = computed(() => hoveringItem.value?.itemIndex);
const isHoveringItem = computed(() => Boolean(hoveringItem.value));
const itemsLength = computed(() => ndvStore.ndvInputDataWithPinnedData.length);
const itemIndex = computed(
	() => hoveringItemIndex.value ?? ndvStore.expressionOutputItemIndex ?? 0,
);
const max = computed(() => Math.max(itemsLength.value - 1, 0));
const isItemIndexEditable = computed(() => !isHoveringItem.value && itemsLength.value > 0);
const hideTableHoverHint = computed(() => ndvStore.isTableHoverOnboarded);
const canSelectPrevItem = computed(() => isItemIndexEditable.value && itemIndex.value !== 0);
const canSelectNextItem = computed(
	() => isItemIndexEditable.value && itemIndex.value < itemsLength.value - 1,
);

const inputCharWidth = computed(() => itemIndex.value.toString().length);

function updateItemIndex(index: number) {
	ndvStore.expressionOutputItemIndex = index;
}

function nextItem() {
	ndvStore.expressionOutputItemIndex = ndvStore.expressionOutputItemIndex + 1;
}

function prevItem() {
	ndvStore.expressionOutputItemIndex = ndvStore.expressionOutputItemIndex - 1;
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
				:style="{ '--input-width': `calc(${inputCharWidth}ch + var(--spacing--sm))` }"
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
</template>

<style lang="scss" module>
.item {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.controls {
	display: flex;
	align-items: center;
}

.controls .input {
	--input-height: 22px;
	--input-border-top-left-radius: var(--radius);
	--input-border-bottom-left-radius: var(--radius);
	--input-border-top-right-radius: var(--radius);
	--input-border-bottom-right-radius: var(--radius);
	line-height: calc(var(--input-height) - var(--spacing--4xs));

	&.hovering {
		--input-font-color: var(--color--secondary);
	}

	:global(.el-input__inner) {
		height: var(--input-height);
		min-height: var(--input-height);
		line-height: var(--input-height);
		text-align: center;
		padding: 0 var(--spacing--4xs);
		max-width: var(--input-width);
	}
}
</style>
