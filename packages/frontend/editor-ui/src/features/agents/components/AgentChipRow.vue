<script setup lang="ts">
import { N8nText } from '@n8n/design-system';

import AgentChipAddButton from './AgentChipAddButton.vue';

const props = withDefaults(
	defineProps<{
		label: string;
		itemCount: number;
		addLabel: string;
		addButtonTestId?: string;
		disabled?: boolean;
		showLabel?: boolean;
	}>(),
	{
		addButtonTestId: undefined,
		disabled: false,
		showLabel: true,
	},
);

defineSlots<{
	default?: () => unknown;
	extra?: () => unknown;
	/** Replaces the add button, e.g. with a menu trigger. `compact` is true when the row has items. */
	add?: (props: { compact: boolean }) => unknown;
}>();

const emit = defineEmits<{
	add: [];
}>();
</script>

<template>
	<div :class="$style.row" :inert="props.disabled || undefined">
		<N8nText v-if="props.showLabel && props.itemCount > 0" bold :class="$style.label">
			{{ props.label }}
		</N8nText>

		<div :class="$style.content">
			<div :class="$style.chips">
				<slot />

				<slot name="add" :compact="props.itemCount > 0">
					<AgentChipAddButton
						:label="props.addLabel"
						:compact="props.itemCount > 0"
						:disabled="props.disabled"
						:test-id="props.addButtonTestId"
						@click="emit('add')"
					/>
				</slot>
			</div>

			<div v-if="$slots.extra" :class="$style.extra">
				<slot name="extra" />
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.row {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
}

.label {
	--n8n--row-label-width: max(7%, calc(var(--spacing--3xl) + var(--spacing--sm)));
	flex: 0 0 var(--n8n--row-label-width);
	line-height: var(--line-height--sm);
	margin-top: var(--spacing--3xs);
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.chips {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.extra {
	min-width: 0;
}

@media (max-width: 768px) {
	.row {
		flex-direction: column;
		gap: var(--spacing--xs);
	}

	.label {
		flex-basis: auto;
		line-height: var(--line-height--sm);
	}
}
</style>
