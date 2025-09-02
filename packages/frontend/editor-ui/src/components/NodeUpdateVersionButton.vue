<script lang="ts" setup>
import { NODE_VERSION_UPDATE_MODAL_KEY } from '@/constants';
import type { ButtonSize } from '@/Interface';
import { useUIStore } from '@/stores/ui.store';

import type { ButtonType } from '@n8n/design-system';

const props = withDefaults(
	defineProps<{
		nodeName: string;
		nodeId: string;
		disabled?: boolean;
		type?: ButtonType;
		size?: ButtonSize;
		hideLabel?: boolean;
		tooltipPlacement?: 'top' | 'bottom' | 'left' | 'right';
	}>(),
	{
		disabled: false,
		type: 'secondary',
		size: 'small',
	},
);

const slots = defineSlots<{ persistentTooltipContent?: {} }>();

defineOptions({
	inheritAttrs: false,
});

const openNodeVersionUpdateModal = () => {
	useUIStore().openModalWithData({
		name: NODE_VERSION_UPDATE_MODAL_KEY,
		data: {
			nodeId: props.nodeId,
			nodeName: props.nodeName,
		},
	});
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
			:label="hideLabel ? undefined : 'Update version'"
			:square="hideLabel"
			:type="type"
			:size="size"
			:outline="true"
			icon="arrow-up"
			@click="openNodeVersionUpdateModal"
		/>
	</N8nTooltip>
</template>
