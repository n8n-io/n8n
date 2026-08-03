<script setup lang="ts">
// Aliased: this SFC is itself named `SelectItem`, so an unaliased import leaves
// `<SelectItem>` in the template ambiguous with the component's own
// self-reference. Runtime always picked reka-ui's, but the type checker resolved
// it to this component's own props during declaration emit.
import {
	SelectItem as RekaSelectItem,
	SelectItemIndicator,
	SelectItemText,
	type AcceptableValue,
} from 'reka-ui';
import { computed, useCssModule } from 'vue';

import Icon from '@n8n/design-system/components/N8nIcon/Icon.vue';

import type { SelectItemBaseProps, SelectItemSlotProps, SelectValue } from './Select.types';

defineOptions({ inheritAttrs: false });
const props = defineProps<SelectItemBaseProps>();

// Declared rather than inferred from the template: inferring slot props wraps
// them in `LooseRequired` from @vue/shared, a transitive dependency the compiler
// cannot name portably (TS2883), so this component's declaration is otherwise
// skipped.
defineSlots<{
	'item-leading'?: SelectItemSlotProps;
	'item-label'?: (props: { item: SelectItemBaseProps }) => unknown;
	'item-trailing'?: SelectItemSlotProps;
}>();

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
	<RekaSelectItem
		:disabled="props.disabled"
		:value="isAcceptable(props.value)"
		:class="props.class"
		@select="props.onSelect?.($event)"
	>
		<slot name="item-leading" :item="props" :ui="leadingProps">
			<Icon v-if="props.icon" :icon="props.icon" v-bind="leadingProps" />
		</slot>

		<SelectItemText :class="$style.itemText">
			<slot name="item-label" :item="props">
				{{ props.label }}
			</slot>
		</SelectItemText>

		<slot name="item-trailing" :item="props" :ui="trailingProps" />
		<SelectItemIndicator as-child>
			<Icon icon="check" :class="$style.itemIndicator" />
		</SelectItemIndicator>
	</RekaSelectItem>
</template>

<style module>
.itemLeading {
	flex-shrink: 0;
}

.itemText {
	flex-grow: 1;
}

.itemIndicator,
.itemTrailing {
	margin-left: auto;
	flex-shrink: 0;
}
</style>
