<script setup lang="ts">
import { N8nButton, type ButtonProps } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import ContactInstanceAdminModal from './ContactInstanceAdminModal.vue';

// The wrapper only groups the button and its dialog; attributes belong on the button.
defineOptions({ inheritAttrs: false });

const {
	nodeTypeName,
	variant = 'solid',
	size = 'small',
} = defineProps<{
	nodeTypeName: string;
	variant?: ButtonProps['variant'];
	size?: ButtonProps['size'];
}>();

// Exposed so a host that unmounts on close (the popover) can stay mounted while the dialog is up.
const isContactAdminOpen = defineModel<boolean>('dialogOpen', { default: false });

const i18n = useI18n();
</script>

<template>
	<span :class="$style.root">
		<N8nButton
			v-bind="$attrs"
			:variant="variant"
			:size="size"
			data-test-id="node-restricted-contact-admin"
			@click="isContactAdminOpen = true"
		>
			<template v-if="$slots.icon" #icon>
				<slot name="icon" />
			</template>
			{{ i18n.baseText('typeAvailabilityPolicies.restrictedNode.contactAdmin') }}
			<slot name="suffix" />
		</N8nButton>
		<ContactInstanceAdminModal v-model:open="isContactAdminOpen" :node-type-name="nodeTypeName" />
	</span>
</template>

<style lang="scss" module>
// The dialog teleports away, so the wrapper must not take part in the host's layout.
.root {
	display: contents;
}
</style>
