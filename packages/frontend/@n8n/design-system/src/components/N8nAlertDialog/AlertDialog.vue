<script setup lang="ts">
import { DialogRoot, DialogPortal } from 'reka-ui';

import N8nButton from '@n8n/design-system/components/N8nButton/Button.vue';
import N8nDialogContent from '@n8n/design-system/components/N8nDialog/DialogContent.vue';
import N8nDialogDescription from '@n8n/design-system/components/N8nDialog/DialogDescription.vue';
import N8nDialogFooter from '@n8n/design-system/components/N8nDialog/DialogFooter.vue';
import N8nDialogHeader from '@n8n/design-system/components/N8nDialog/DialogHeader.vue';
import N8nDialogOverlay from '@n8n/design-system/components/N8nDialog/DialogOverlay.vue';
import N8nDialogTitle from '@n8n/design-system/components/N8nDialog/DialogTitle.vue';

export type AlertDialogActionVariant = 'solid' | 'destructive';
export type AlertDialogSize = 'small' | 'medium';

export interface AlertDialogProps {
	/**
	 * Controlled open state of the alert dialog
	 */
	open?: boolean;
	/**
	 * The open state of the alert dialog when it is initially rendered.
	 * Use when you do not need to control its open state.
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

withDefaults(defineProps<AlertDialogProps>(), {
	actionLabel: 'Confirm',
	actionVariant: 'solid',
	cancelLabel: 'Cancel',
	loading: false,
	size: 'small',
});

const emit = defineEmits<AlertDialogEmits>();

defineSlots<{
	/**
	 * Optional additional content between description and footer
	 */
	default?: () => unknown;
}>();

const handleOpenChange = (value: boolean) => {
	emit('update:open', value);
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
	<DialogRoot :open="open" :default-open="defaultOpen" @update:open="handleOpenChange">
		<DialogPortal>
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
					<N8nButton variant="subtle" :label="cancelLabel" @click="handleCancel" />
					<N8nButton
						:variant="actionVariant === 'destructive' ? 'destructive' : 'solid'"
						:label="actionLabel"
						:loading="loading"
						@click="handleAction"
					/>
				</N8nDialogFooter>
			</N8nDialogContent>
		</DialogPortal>
	</DialogRoot>
</template>
