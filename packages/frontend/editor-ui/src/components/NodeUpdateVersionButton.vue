<script lang="ts" setup>
import { NODE_VERSION_UPDATE_MODAL_KEY } from '@/constants';
import type { ButtonSize } from '@/Interface';
import { useUIStore } from '@/stores/ui.store';

import type { ButtonType } from '@n8n/design-system';

withDefaults(
	defineProps<{
		nodeName: string;
		disabled?: boolean;
		type?: ButtonType;
		size?: ButtonSize;
		hideLabel?: boolean;
		tooltipPlacement?: 'top' | 'bottom' | 'left' | 'right';
	}>(),
	{
		disabled: false,
	},
);

const slots = defineSlots<{ persistentTooltipContent?: {} }>();

defineOptions({
	inheritAttrs: false,
});

const openNodeVersionUpdateModal = () => {
	useUIStore().openModal(NODE_VERSION_UPDATE_MODAL_KEY);
};
</script>

<template>
	<N8nTooltip
		:placement="tooltipPlacement ?? 'right'"
		:visible="slots.persistentTooltipContent ? true : undefined"
	>
		<template #content>
			<slot name="persistentTooltipContent"> Update node to the latest version </slot>
		</template>
		<N8nButton
			v-bind="$attrs"
			label="Update version"
			:type="type"
			:size="size"
			icon="arrow-up"
			title="title"
			@click="openNodeVersionUpdateModal"
		/>
	</N8nTooltip>
</template>
