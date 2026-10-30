<script setup lang="ts" generic="T extends string">
import {
	N8nButton,
	N8nDropdownMenu,
	N8nIcon,
	type DropdownMenuItemProps,
	type IconName,
} from '@n8n/design-system';
import { computed } from 'vue';

const props = defineProps<{
	options: Array<{ value: T; label: string; icon: IconName }>;
	label: string;
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
	<N8nDropdownMenu :items="items" placement="bottom-end" @select="selected = $event">
		<template #trigger>
			<N8nButton variant="ghost" size="small" :aria-label="label">
				<N8nIcon v-if="selectedOption" :icon="selectedOption.icon" size="small" />
				<N8nIcon icon="chevron-down" :size="12" />
			</N8nButton>
		</template>
	</N8nDropdownMenu>
</template>
