<script lang="ts" setup>
import type { ButtonVariant } from '@n8n/design-system';
import { useTemplateRef } from 'vue';

import { N8nDropdown, N8nIconButton } from '@n8n/design-system';

defineProps<{
	actions: Array<{ label: string; value: string }>;
	disabled?: boolean;
	variant?: ButtonVariant;
}>();

const emit = defineEmits<{
	action: [id: string];
}>();

const actionToggleRef = useTemplateRef('actionToggleRef');

defineExpose({
	openActionToggle: (isOpen: boolean) => {
		if (isOpen) actionToggleRef.value?.open();
		else actionToggleRef.value?.close();
	},
});
</script>

<template>
	<div :class="[$style.buttonGroup]">
		<slot></slot>
		<N8nDropdown
			ref="actionToggleRef"
			data-test-id="add-resource"
			:actions="actions"
			@action="emit('action', $event)"
		>
			<template #trigger>
				<N8nIconButton
					:disabled="disabled"
					:class="[$style.buttonGroupDropdown]"
					icon="chevron-down"
					:variant="variant ?? 'solid'"
				/>
			</template>
		</N8nDropdown>
	</div>
</template>

<style lang="scss" module>
.buttonGroup {
	display: inline-flex;

	:global(> .button) {
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
	border-left: 1px solid var(--color--black-alpha-100);
	border-top-left-radius: 0;
	border-bottom-left-radius: 0;
}
</style>
