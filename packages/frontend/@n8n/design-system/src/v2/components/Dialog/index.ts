export {
	DialogRoot as N8nDialogRoot,
	DialogTrigger as N8nDialogTrigger,
	DialogPortal as N8nDialogPortal,
	DialogClose as N8nDialogClose,
} from 'reka-ui';

export { default as N8nDialogOverlay } from './DialogOverlay.vue';
export { default as N8nDialogContent } from './DialogContent.vue';
export { default as N8nDialogHeader } from './DialogHeader.vue';
export { default as N8nDialogTitle } from './DialogTitle.vue';
export { default as N8nDialogDescription } from './DialogDescription.vue';
export { default as N8nDialogFooter } from './DialogFooter.vue';
export { default as N8nAlertDialog } from './AlertDialog.vue';

export type { DialogOverlayProps } from './DialogOverlay.vue';
export type {
	DialogContentProps,
	DialogContentEmits,
	DialogContentSize,
} from './DialogContent.vue';
export type { DialogTitleProps } from './DialogTitle.vue';
export type { DialogDescriptionProps } from './DialogDescription.vue';
export type {
	AlertDialogProps,
	AlertDialogEmits,
	AlertDialogActionVariant,
	AlertDialogSize,
} from './AlertDialog.vue';
