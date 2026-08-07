<script setup lang="ts">
import { SelectItem, SelectItemIndicator, SelectItemText } from 'reka-ui';
import { useCssModule } from 'vue';

import Icon from '@n8n/design-system/components/N8nIcon/Icon.vue';

import { isRekaAcceptableValue, type SelectOptionBase } from './Select.types';

defineOptions({ inheritAttrs: false });

type SelectItemComponentProps = SelectOptionBase & {
	class?: string | Record<string, boolean> | Array<string | Record<string, boolean>>;
	strokeWidth?: number;
};

const props = defineProps<SelectItemComponentProps>();
const $style = useCssModule();

function resolveValue() {
	if (isRekaAcceptableValue(props.value)) {
		return props.value;
	}

	return '';
}

function leadingUi() {
	return {
		class: $style.itemLeading,
		strokeWidth: props.strokeWidth,
	};
}

function trailingUi() {
	return {
		class: $style.itemTrailing,
		strokeWidth: props.strokeWidth,
	};
}
</script>

<template>
	<SelectItem
		data-test-id="select-item"
		:disabled="props.disabled"
		:value="resolveValue()"
		:class="props.class"
		@select="props.onSelect?.($event)"
	>
		<slot name="item-leading" :item="props" :ui="leadingUi()">
			<Icon v-if="props.icon" :icon="props.icon" color="text-base" v-bind="leadingUi()" />
		</slot>

		<SelectItemText :class="$style.itemText">
			<slot name="item-label" :item="props">
				{{ props.label }}
			</slot>
		</SelectItemText>

		<slot name="item-trailing" :item="props" :ui="trailingUi()" />
		<SelectItemIndicator as-child>
			<Icon icon="check" color="text-light" :class="$style.itemIndicator" />
		</SelectItemIndicator>
	</SelectItem>
</template>

<style module>
.itemLeading {
	flex-shrink: 0;
}

.itemText {
	flex-grow: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	line-height: var(--line-height--md);
}

.itemIndicator,
.itemTrailing {
	margin-left: auto;
	flex-shrink: 0;
}
</style>
