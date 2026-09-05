<script setup lang="ts">
// Aliased: this SFC is itself named `SelectItem`, so an unaliased import leaves
// `<SelectItem>` in the template ambiguous with the component's own
// self-reference. Runtime always picked reka-ui's, but the type checker resolved
// it to this component's own props during declaration emit.
import { SelectItem as RekaSelectItem, SelectItemIndicator, SelectItemText } from 'reka-ui';
import { computed, useCssModule } from 'vue';

import type { SelectItemSlots, SelectOptionBase } from './Select.types';
import Icon from '../../../components/N8nIcon/Icon.vue';

defineOptions({ inheritAttrs: false });

type SelectItemComponentProps = SelectOptionBase & {
	class?: string | Record<string, boolean> | Array<string | Record<string, boolean>>;
	strokeWidth?: number;
};

const props = defineProps<SelectItemComponentProps>();
defineSlots<SelectItemSlots>();
const $style = useCssModule();

const leadingProps = computed(() => ({
	class: $style.itemLeading,
	strokeWidth: props.strokeWidth,
}));

const trailingProps = computed(() => ({
	class: $style.itemTrailing,
	strokeWidth: props.strokeWidth,
}));

const typeaheadText = computed(() => props.textValue ?? props.label);
</script>

<template>
	<RekaSelectItem
		data-test-id="select-item"
		:disabled="props.disabled"
		:value="props.value"
		:text-value="typeaheadText"
		:class="props.class"
		@select="props.onSelect?.($event)"
	>
		<slot name="item-leading" :item="props" :ui="leadingProps">
			<Icon v-if="props.icon" :icon="props.icon" color="text-base" v-bind="leadingProps" />
		</slot>

		<SelectItemText :class="$style.itemText">
			<slot name="item-label" :item="props">
				{{ props.label }}
			</slot>
		</SelectItemText>

		<slot name="item-trailing" :item="props" :ui="trailingProps" />
		<SelectItemIndicator as-child>
			<Icon icon="check" color="text-light" :class="$style.itemIndicator" />
		</SelectItemIndicator>
	</RekaSelectItem>
</template>

<style module>
.itemLeading {
	flex-shrink: 0;
	margin-top: var(--spacing--5xs);
}

.itemText {
	flex-grow: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	line-height: var(--line-height--lg);
}

.itemIndicator,
.itemTrailing {
	margin-left: auto;
	flex-shrink: 0;
}

.itemIndicator {
	margin-top: var(--spacing--5xs);
}

.itemTrailing {
	align-self: center;
}
</style>
