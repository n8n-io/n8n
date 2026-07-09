<script setup lang="ts">
import { useCssModule } from 'vue';

import Icon from '@n8n/design-system/components/N8nIcon/Icon.vue';

import type {
	ComboboxItemDefaultProps,
	ComboboxItemDefaultSlots,
} from './ComboboxItemDefault.types';

const props = defineProps<ComboboxItemDefaultProps>();

defineSlots<ComboboxItemDefaultSlots>();

const $style = useCssModule();
</script>

<template>
	<div :class="$style.root" :data-disabled="props.disabled || undefined">
		<slot name="item-leading" :item="props" :ui="{ class: $style.itemLeading }">
			<Icon v-if="props.icon" :icon="props.icon" :class="$style.itemLeading" size="large" />
		</slot>

		<span :class="$style.itemText">
			<slot name="item-label" :item="props">
				{{ props.label }}
			</slot>
		</span>

		<slot name="item-trailing" :item="props" :ui="{ class: $style.itemTrailing }" />

		<slot name="item-indicator" :ui="{ class: $style.itemIndicator }" />
	</div>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/floating-item' as floating-item;

.root {
	@include floating-item.floating-item;

	width: 100%;
	min-width: 0;
	color: var(--text-color);

	&:not([data-disabled]) {
		&[data-highlighted] {
			background-color: var(--background--hover);
			cursor: pointer;
		}

		&:hover {
			cursor: pointer;
		}
	}

	&[data-disabled] {
		color: var(--text-color--disabled);
		cursor: not-allowed;
	}
}

.itemLeading {
	flex-shrink: 0;
}

.itemText {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.itemIndicator,
.itemTrailing {
	margin-left: auto;
	flex-shrink: 0;
}
</style>
