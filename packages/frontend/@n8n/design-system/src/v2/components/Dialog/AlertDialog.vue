<script setup lang="ts">
import { DialogRoot, DialogTrigger, DialogPortal } from 'reka-ui';
import { computed, ref } from 'vue';

import N8nDialogOverlay from './DialogOverlay.vue';
import N8nDialogContent from './DialogContent.vue';
import N8nDialogHeader from './DialogHeader.vue';
import N8nDialogTitle from './DialogTitle.vue';
import N8nDialogDescription from './DialogDescription.vue';
import N8nDialogFooter from './DialogFooter.vue';
import N8nButton from '../../../components/N8nButton/Button.vue';

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

const isControlled = computed(() => props.open !== undefined);
const internalOpen = ref(props.defaultOpen);

const isOpen = computed({
	get: () => (isControlled.value ? props.open! : internalOpen.value),
	set: (value: boolean) => {
		if (!isControlled.value) {
			internalOpen.value = value;
		}
		emit('update:open', value);
	},
});

const handleOpenChange = (open: boolean) => {
	isOpen.value = open;
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
	<DialogRoot :open="isOpen" @update:open="handleOpenChange">
		<DialogTrigger v-if="$slots.trigger" as-child>
			<slot name="trigger" />
		</DialogTrigger>

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
					<N8nButton type="secondary" :label="cancelLabel" @click="handleCancel" />
					<N8nButton
						:type="actionVariant === 'destructive' ? 'danger' : 'primary'"
						:label="actionLabel"
						:loading="loading"
						@click="handleAction"
					/>
				</N8nDialogFooter>
			</N8nDialogContent>
		</DialogPortal>
	</DialogRoot>
</template>
