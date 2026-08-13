<script setup lang="ts">
import { DialogRoot, DialogPortal } from 'reka-ui';

import N8nDialogContent from './DialogContent.vue';
import N8nDialogDescription from './DialogDescription.vue';
import N8nDialogHeader from './DialogHeader.vue';
import N8nDialogOverlay from './DialogOverlay.vue';
import N8nDialogTitle from './DialogTitle.vue';

export type DialogSize =
	| 'small'
	| 'medium'
	| 'large'
	| 'xlarge'
	| '2xlarge'
	| 'fit'
	| 'full'
	| 'cover';

export interface DialogProps {
	/**
	 * Controlled open state of the dialog
	 */
	open?: boolean;
	/**
	 * The open state of the dialog when it is initially rendered.
	 * Use when you do not need to control its open state.
	 */
	defaultOpen?: boolean;
	/**
	 * Whether the dialog is modal (blocks interaction with the rest of the page)
	 * @default true
	 */
	modal?: boolean;
	/**
	 * Dialog width preset
	 * @default 'medium'
	 */
	size?: DialogSize;
	/**
	 * Force mount for animation control
	 */
	forceMount?: boolean;
	/**
	 * Trap focus within dialog
	 * @default true
	 */
	trapFocus?: boolean;
	/**
	 * Prevent clicks outside dialog
	 * @default true
	 */
	disableOutsidePointerEvents?: boolean;
	/**
	 * Shows/hides close button in top right
	 * @default true
	 */
	showCloseButton?: boolean;
	/**
	 * Accessible label for the dialog (used when DialogTitle is not provided)
	 */
	ariaLabel?: string;
	/**
	 * Accessible description for the dialog (used when DialogDescription is not provided)
	 */
	ariaDescription?: string;
	/**
	 * Shorthand for rendering a dialog header with a title.
	 * Alternative to using N8nDialogHeader and N8nDialogTitle as children.
	 */
	header?: string;
	/**
	 * Shorthand for rendering a dialog description below the header.
	 * Alternative to using N8nDialogDescription as a child.
	 * Only rendered when header prop is also provided.
	 */
	description?: string;
}

export interface DialogEmits {
	escapeKeyDown: [event: KeyboardEvent];
	interactOutside: [event: Event];
	openAutoFocus: [event: Event];
	closeAutoFocus: [event: Event];
	'update:open': [value: boolean];
}

withDefaults(defineProps<DialogProps>(), {
	modal: true,
	size: 'medium',
	trapFocus: true,
	disableOutsidePointerEvents: true,
	showCloseButton: true,
});
const emit = defineEmits<DialogEmits>();

const handleOpenChange = (value: boolean) => {
	emit('update:open', value);
};
</script>

<template>
	<DialogRoot
		:open="open"
		:default-open="defaultOpen"
		:modal="modal"
		@update:open="handleOpenChange"
	>
		<DialogPortal>
			<N8nDialogOverlay />
			<N8nDialogContent
				:size="size"
				:force-mount="forceMount"
				:trap-focus="trapFocus"
				:disable-outside-pointer-events="disableOutsidePointerEvents"
				:show-close-button="showCloseButton"
				:aria-label="ariaLabel"
				:aria-description="ariaDescription"
				@escape-key-down="emit('escapeKeyDown', $event)"
				@interact-outside="emit('interactOutside', $event)"
				@open-auto-focus="emit('openAutoFocus', $event)"
				@close-auto-focus="emit('closeAutoFocus', $event)"
			>
				<N8nDialogHeader v-if="header">
					<N8nDialogTitle>{{ header }}</N8nDialogTitle>
					<N8nDialogDescription v-if="description">{{ description }}</N8nDialogDescription>
				</N8nDialogHeader>
				<slot />
			</N8nDialogContent>
		</DialogPortal>
	</DialogRoot>
</template>
