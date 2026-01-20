<script setup lang="ts">
import {
	DialogRoot as N8nDialogRoot,
	DialogTrigger as N8nDialogTrigger,
	DialogPortal as N8nDialogPortal,
} from 'reka-ui';
import { ref, watch } from 'vue';

import N8nButton from '@n8n/design-system/components/N8nButton/Button.vue';
import N8nDialogContent from '@n8n/design-system/v2/components/Dialog/DialogContent.vue';
import N8nDialogDescription from '@n8n/design-system/v2/components/Dialog/DialogDescription.vue';
import N8nDialogFooter from '@n8n/design-system/v2/components/Dialog/DialogFooter.vue';
import N8nDialogHeader from '@n8n/design-system/v2/components/Dialog/DialogHeader.vue';
import N8nDialogOverlay from '@n8n/design-system/v2/components/Dialog/DialogOverlay.vue';
import N8nDialogTitle from '@n8n/design-system/v2/components/Dialog/DialogTitle.vue';

export type AlertDialogActionVariant = 'solid' | 'destructive';
export type AlertDialogSize = 'small' | 'medium';

export interface AlertDialogProps {
	/**
	 * Controlled open state
	 */
	open?: boolean;
	/**
	 * Initial open state (uncontrolled)
	 * @default false
	 */
	defaultOpen?: boolean;
	/**
	 * Dialog title text (required)
	 */
	title: string;
	/**
	 * Optional description text
	 */
	description?: string;
	/**
	 * Label for the action button
	 * @default 'Confirm'
	 */
	actionLabel?: string;
	/**
	 * Visual style of the action button
	 * @default 'solid'
	 */
	actionVariant?: AlertDialogActionVariant;
	/**
	 * Label for the cancel button
	 * @default 'Cancel'
	 */
	cancelLabel?: string;
	/**
	 * Shows loading state on action button
	 * @default false
	 */
	loading?: boolean;
	/**
	 * Dialog width
	 * @default 'small'
	 */
	size?: AlertDialogSize;
}

export interface AlertDialogEmits {
	'update:open': [open: boolean];
	action: [];
	cancel: [];
}

const props = withDefaults(defineProps<AlertDialogProps>(), {
	defaultOpen: false,
	actionLabel: 'Confirm',
	actionVariant: 'solid',
	cancelLabel: 'Cancel',
	loading: false,
	size: 'small',
});

const emit = defineEmits<AlertDialogEmits>();

defineSlots<{
	/**
	 * Trigger element that opens the dialog
	 */
	trigger?: () => unknown;
	/**
	 * Optional additional content between description and footer
	 */
	default?: () => unknown;
}>();

const internalOpen = ref(props.open ?? props.defaultOpen);

// Sync internal state with controlled prop
watch(
	() => props.open,
	(newVal) => {
		if (newVal !== undefined) {
			internalOpen.value = newVal;
		}
	},
);

const handleOpenChange = (open: boolean) => {
	internalOpen.value = open;
	emit('update:open', open);
};

const handleAction = () => {
	emit('action');
};

const handleCancel = () => {
	emit('cancel');
	handleOpenChange(false);
};
</script>

<template>
	<N8nDialogRoot :open="internalOpen" @update:open="handleOpenChange">
		<N8nDialogTrigger v-if="$slots.trigger" as-child>
			<slot name="trigger" />
		</N8nDialogTrigger>

		<N8nDialogPortal>
			<N8nDialogOverlay />
			<N8nDialogContent :size="size" :show-close-button="false">
				<N8nDialogHeader>
					<N8nDialogTitle>{{ title }}</N8nDialogTitle>
					<N8nDialogDescription v-if="description">
						{{ description }}
					</N8nDialogDescription>
				</N8nDialogHeader>

				<slot />

				<N8nDialogFooter>
					<N8nButton type="secondary" :label="cancelLabel" @click="handleCancel" />
					<N8nButton
						:type="actionVariant === 'destructive' ? 'danger' : 'primary'"
						:label="actionLabel"
						:loading="loading"
						@click="handleAction"
					/>
				</N8nDialogFooter>
			</N8nDialogContent>
		</N8nDialogPortal>
	</N8nDialogRoot>
</template>
