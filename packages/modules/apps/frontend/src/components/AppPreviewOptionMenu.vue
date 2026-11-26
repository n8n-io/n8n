<script setup lang="ts" generic="T extends string">
import {
	N8nDropdownMenu,
	N8nIconButton,
	N8nTooltip,
	type DropdownMenuItemProps,
	type IconName,
} from '@n8n/design-system';
import { computed } from 'vue';

defineOptions({ inheritAttrs: false });

const props = defineProps<{
	options: Array<{ value: T; label: string; icon: IconName }>;
	label: string;
	disabled?: boolean;
}>();

const selected = defineModel<T>({ required: true });

const items = computed<Array<DropdownMenuItemProps<T>>>(() =>
	props.options.map(({ value, label, icon }) => ({
		id: value,
		label,
		icon: { type: 'icon', value: icon },
		checked: value === selected.value,
	})),
);

const selectedOption = computed(() => props.options.find(({ value }) => value === selected.value));
</script>

<template>
	<N8nTooltip :content="label">
		<N8nDropdownMenu
			v-bind="$attrs"
			:items="items"
			:disabled="disabled"
			placement="bottom-start"
			@select="selected = $event"
		>
			<template #trigger>
				<!-- The icon shows the current choice, so the trigger needs no chevron. -->
				<N8nIconButton
					:icon="selectedOption?.icon ?? options[0].icon"
					variant="ghost"
					size="small"
					:aria-label="label"
					:disabled="disabled"
				/>
			</template>
		</N8nDropdownMenu>
	</N8nTooltip>
</template>
