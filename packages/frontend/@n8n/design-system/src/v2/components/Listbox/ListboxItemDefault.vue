<script setup lang="ts">
import { useCssModule } from 'vue';

import type { ListboxItemDefaultProps, ListboxItemDefaultSlots } from './Listbox.types';

defineOptions({ inheritAttrs: false });

const props = defineProps<ListboxItemDefaultProps>();
const slots = defineSlots<ListboxItemDefaultSlots>();
const $style = useCssModule();

const slotUi = {
	info: $style.info,
	leading: $style.leading,
	text: $style.text,
	label: $style.label,
	description: $style.description,
};
</script>

<template>
	<div :class="$style.info" data-test-id="listbox-item-default">
		<div v-if="!!slots.leading" :class="$style.leading" data-test-id="listbox-item-leading">
			<slot
				name="leading"
				:label="props.label"
				:description="props.description"
				:disabled="props.disabled"
				:ui="slotUi"
			/>
		</div>
		<div :class="$style.text">
			<slot name="label" :label="props.label" :disabled="props.disabled" :ui="slotUi">
				<span v-if="props.label" :class="$style.label" data-test-id="listbox-item-label">
					{{ props.label }}
				</span>
			</slot>
			<slot
				name="description"
				:description="props.description"
				:disabled="props.disabled"
				:ui="slotUi"
			>
				<span
					v-if="props.description"
					:class="$style.description"
					data-test-id="listbox-item-description"
				>
					{{ props.description }}
				</span>
			</slot>
		</div>
	</div>
</template>

<style module>
.info {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: var(--spacing--sm);
	min-width: 0;
	max-width: 100%;
}

.leading {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.text {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--3xs);
	min-width: 0;
	max-width: 100%;
	flex: 1;
}

.label {
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: var(--listbox-label-font-size, var(--font-size--sm));
	font-weight: var(--font-weight--medium);
	line-height: var(--listbox-label-line-height, var(--line-height--md));
	color: var(--color--text--shade-1);
}

.description {
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: var(--listbox-description-font-size, var(--font-size--xs));
	line-height: var(--listbox-description-line-height, var(--line-height--sm));
	color: var(--text-color--subtle);
}
</style>
