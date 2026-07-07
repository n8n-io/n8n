<script setup lang="ts">
import { useSlots } from 'vue';

import { ComboboxItem, ComboboxItemIndicator } from 'reka-ui';

import Icon from '@n8n/design-system/components/N8nIcon/Icon.vue';

import type { ComboboxListItem } from './Combobox.types';
import type { ComboboxItemDefaultSlots } from './ComboboxItemDefault.types';
import ComboboxItemDefault from './ComboboxItemDefault.vue';

defineOptions({ inheritAttrs: false });

defineSlots<ComboboxItemDefaultSlots>();

const props = defineProps<ComboboxListItem>();
const slots = useSlots();
</script>

<template>
	<ComboboxItem
		as-child
		:disabled="props.disabled"
		:value="props.value ?? null"
		:text-value="props.textValue ?? props.label"
	>
		<ComboboxItemDefault :label="props.label" :icon="props.icon" :size="props.size">
			<template v-if="slots['item-leading']" #item-leading="slotProps">
				<slot name="item-leading" v-bind="slotProps" />
			</template>
			<template v-if="slots['item-label']" #item-label="slotProps">
				<slot name="item-label" v-bind="slotProps" />
			</template>
			<template v-if="slots['item-trailing']" #item-trailing="slotProps">
				<slot name="item-trailing" v-bind="slotProps" />
			</template>
			<template #item-indicator="{ ui }">
				<slot name="item-indicator" :ui="ui">
					<ComboboxItemIndicator as-child>
						<Icon icon="check" v-bind="ui" />
					</ComboboxItemIndicator>
				</slot>
			</template>
		</ComboboxItemDefault>
	</ComboboxItem>
</template>
