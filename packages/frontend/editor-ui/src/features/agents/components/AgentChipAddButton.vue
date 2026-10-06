<script setup lang="ts">
import { N8nButton, N8nIcon, N8nTooltip } from '@n8n/design-system';

/**
 * The "add" control of a chip row: an icon-only plus with a tooltip when the row has
 * items, a text button when it is empty. Shared by the plain row and by menu triggers.
 */
const props = withDefaults(
	defineProps<{
		label: string;
		compact: boolean;
		disabled?: boolean;
		testId?: string;
	}>(),
	{
		disabled: false,
		testId: undefined,
	},
);

// The native event is forwarded: a menu trigger wrapping this button (`as-child`)
// reads it, and a bare `emit('click')` would hand it `undefined`.
const emit = defineEmits<{
	click: [event: MouseEvent];
}>();
</script>

<template>
	<N8nTooltip v-if="props.compact" :content="props.label" placement="top">
		<N8nButton
			variant="ghost"
			size="medium"
			icon-only
			:aria-label="props.label"
			:disabled="props.disabled"
			:data-testid="props.testId"
			@click="emit('click', $event)"
		>
			<template #icon>
				<N8nIcon icon="plus" :size="16" color="text-light" />
			</template>
		</N8nButton>
	</N8nTooltip>

	<N8nButton
		v-else
		:class="$style.emptyAddButton"
		variant="ghost"
		size="medium"
		:disabled="props.disabled"
		:data-testid="props.testId"
		@click="emit('click', $event)"
	>
		{{ props.label }}
	</N8nButton>
</template>

<style module lang="scss">
.emptyAddButton {
	--button--color: var(--text-color--subtler);
	margin-left: calc(-1 * var(--spacing--xs));
	margin-top: calc(-1 * var(--spacing--4xs));

	/** TODO: Consider making this style a generic N8nButton style. DS-652 **/
	&:hover {
		--button--color: var(--text-color);
		background-color: transparent;
	}
}
</style>
