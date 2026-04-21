<script lang="ts" setup>
import { N8nActionDropdown, N8nButton, N8nIconButton } from '@n8n/design-system';
import type { ActionDropdownItem } from '@n8n/design-system/types';
import { computed } from 'vue';

const props = withDefaults(
	defineProps<{
		variant?: 'solid' | 'outline' | 'destructive';
		size?: 'small' | 'medium';
		label: string;
		items: Array<ActionDropdownItem<string>>;
		disabled?: boolean;
		dataTestId?: string;
		dropdownTestId?: string;
		caretAriaLabel?: string;
	}>(),
	{
		variant: 'solid',
		size: 'medium',
		caretAriaLabel: 'More options',
	},
);

const emit = defineEmits<{
	click: [];
	select: [id: string];
}>();

const hasSplit = computed(() => props.items.length > 0);
</script>

<template>
	<div v-if="hasSplit" :class="[$style.splitButton, variant === 'outline' && $style.outline]">
		<N8nButton
			:variant="variant"
			:class="$style.splitButtonMain"
			:label="label"
			:data-test-id="dataTestId"
			:size="size"
			:disabled="disabled"
			@click="emit('click')"
		/>
		<N8nActionDropdown
			:items="items"
			:class="$style.splitButtonDropdown"
			:data-test-id="dropdownTestId"
			placement="bottom-start"
			@select="(id: string) => emit('select', id)"
		>
			<template #activator>
				<N8nIconButton
					:variant="variant"
					icon="chevron-down"
					:class="$style.splitButtonCaret"
					:aria-label="caretAriaLabel"
					:size="size"
					:disabled="disabled"
				/>
			</template>
		</N8nActionDropdown>
	</div>
	<N8nButton
		v-else
		:variant="variant"
		:label="label"
		:data-test-id="dataTestId"
		:size="size"
		:disabled="disabled"
		@click="emit('click')"
	/>
</template>

<style lang="scss" module>
.splitButton {
	display: flex;
	position: relative;
}

.splitButtonMain {
	border-top-right-radius: 0;
	border-bottom-right-radius: 0;
}

.splitButtonDropdown {
	display: flex;
}

.splitButtonCaret {
	border-top-left-radius: 0;
	border-bottom-left-radius: 0;
	border-left: 1px solid rgba(255, 255, 255, 0.3);
}

// Outline: put the border on the wrapper, strip it from individual
// buttons, and use a pseudo-element on the dropdown as the divider.
.outline {
	border: 1px solid light-dark(var(--color--black-alpha-200), var(--color--white-alpha-100));
	border-radius: var(--radius);

	.splitButtonMain,
	.splitButtonCaret {
		--button--border--shadow: 0 0 0 0 transparent;
		--button--border--shadow--hover: 0 0 0 0 transparent;
		--button--border--shadow--active: 0 0 0 0 transparent;
		border-left: 0;
	}

	.splitButtonDropdown {
		position: relative;

		&::before {
			content: '';
			position: absolute;
			left: 0;
			top: 0;
			bottom: 0;
			width: 1px;
			background: light-dark(var(--color--black-alpha-200), var(--color--white-alpha-100));
			pointer-events: none;
		}
	}
}
</style>
