<script lang="ts" setup>
import type { ButtonType } from '@n8n/design-system';
import { N8nIconButton, N8nActionToggle } from '@n8n/design-system';
import { ref } from 'vue';

type Action = {
	label: string;
	value: string;
	disabled: boolean;
};
defineProps<{
	actions: Action[];
	disabled?: boolean;
	type?: ButtonType;
}>();

const emit = defineEmits<{
	action: [id: string];
}>();

const actionToggleRef = ref<InstanceType<typeof N8nActionToggle> | null>(null);

defineExpose({
	openActionToggle: (isOpen: boolean) => actionToggleRef.value?.openActionToggle(isOpen),
});
</script>

<template>
	<div :class="[$style.buttonGroup]">
		<slot></slot>
		<N8nActionToggle
			ref="actionToggleRef"
			data-test-id="add-resource"
			:actions="actions"
			placement="bottom-end"
			:teleported="false"
			@action="emit('action', $event)"
		>
			<N8nIconButton
				:disabled="disabled"
				:class="[$style.buttonGroupDropdown]"
				icon="angle-down"
				:type="type ?? 'primary'"
			/>
		</N8nActionToggle>
	</div>
</template>

<style lang="scss" module>
.buttonGroup {
	display: inline-flex;

	:global(> .button) {
		border-right: 1px solid var(--button-font-color, var(--color-button-primary-font));

		&:not(:first-child) {
			border-radius: 0;
		}

		&:first-child {
			border-top-right-radius: 0;
			border-bottom-right-radius: 0;
		}
	}
}

.buttonGroupDropdown {
	border-top-left-radius: 0;
	border-bottom-left-radius: 0;
}
</style>
