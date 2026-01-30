<script setup lang="ts">
import { SelectItem, SelectItemIndicator, SelectItemText, type AcceptableValue } from 'reka-ui';
import { computed, useCssModule } from 'vue';

import Icon from '@n8n/design-system/components/N8nIcon/Icon.vue';
import N8nText from '@n8n/design-system/components/N8nText/Text.vue';

import type { SelectItemProps, SelectValue } from './Select.types';

defineOptions({ inheritAttrs: false });
const props = defineProps<SelectItemProps>();
const $style = useCssModule();

function isAcceptable(value?: SelectValue) {
	return value as AcceptableValue;
}

const leadingProps = computed(() => ({
	class: $style.itemLeading,
	strokeWidth: props.strokeWidth,
}));
const trailingProps = computed(() => ({
	class: $style.itemTrailing,
	strokeWidth: props.strokeWidth,
}));
</script>

<template>
	<SelectItem
		:disabled="props.disabled"
		:value="isAcceptable(props.value)"
		:class="props.class"
		@select="props.onSelect?.($event)"
	>
		<slot name="item-leading" :item="props" :ui="leadingProps">
			<Icon v-if="props.icon" :icon="props.icon" v-bind="leadingProps" />
		</slot>

		<div :class="$style.itemContent">
			<SelectItemText :class="$style.itemText">
				<slot name="item-label" :item="props">
					{{ props.label }}
				</slot>
			</SelectItemText>
			<N8nText v-if="props.description" size="small" color="text-light" :class="$style.description">
				{{ props.description }}
			</N8nText>
		</div>

		<slot name="item-trailing" :item="props" :ui="trailingProps" />
		<SelectItemIndicator as-child>
			<Icon icon="check" :class="$style.itemIndicator" />
		</SelectItemIndicator>
	</SelectItem>
</template>

<style module>
.itemLeading {
	flex-shrink: 0;
}

.itemContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	flex-grow: 1;
	min-width: 0;
}

.itemText {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.itemIndicator,
.itemTrailing {
	margin-left: auto;
	flex-shrink: 0;
}

.description {
	overflow: hidden;
	text-overflow: ellipsis;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	line-clamp: 2;
	-webkit-box-orient: vertical;
	word-break: break-word;
}
</style>
