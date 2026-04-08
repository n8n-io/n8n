<script setup lang="ts">
import { DialogContent, DialogTitle, DialogDescription, VisuallyHidden } from 'reka-ui';
import { computed, useCssModule } from 'vue';

import N8nDialogClose from './DialogClose.vue';

export type DialogContentSize =
	| 'small'
	| 'medium'
	| 'large'
	| 'xlarge'
	| '2xlarge'
	| 'fit'
	| 'full'
	| 'cover';

export interface DialogContentProps {
	/**
	 * Dialog width preset
	 * @default 'base'
	 */
	size?: DialogContentSize;
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
}

export interface DialogContentEmits {
	escapeKeyDown: [event: KeyboardEvent];
	interactOutside: [event: Event];
	openAutoFocus: [event: Event];
	closeAutoFocus: [event: Event];
}

const props = withDefaults(defineProps<DialogContentProps>(), {
	size: 'medium',
	trapFocus: true,
	disableOutsidePointerEvents: true,
	showCloseButton: true,
});

const emit = defineEmits<DialogContentEmits>();

const $style = useCssModule();

const sizeClasses: Record<DialogContentSize, string> = {
	small: $style.small,
	medium: $style.medium,
	large: $style.large,
	xlarge: $style.xlarge,
	'2xlarge': $style['2xlarge'],
	fit: $style.fit,
	full: $style.full,
	cover: $style.cover,
};

const sizeClass = computed(() => sizeClasses[props.size]);

/** ARIA Fallbacks: These are visually hidden but accessible to screen readers **/
const needsFallbackTitle = computed(() => !!props.ariaLabel);
const needsFallbackDescription = computed(() => !!props.ariaDescription);

/**
 * Handles outside interaction events to prevent Reka UI from closing the dialog
 * when interacting with Element Plus teleported elements (dropdowns, selects, overlays).
 * These elements are teleported to body as siblings of the dialog, so Reka UI's
 * DismissableLayer detects clicks on them as "outside" clicks.
 *
 * TODO: Remove once Element Plus components are migrated to Reka UI, and replace with a simple emit.
 */
function handleInteractOutside(e: Event) {
	const target = e.target as HTMLElement | null;
	if (target?.closest('.el-popper, .el-select-dropdown, .el-overlay')) {
		e.preventDefault();
	}
	emit('interactOutside', e);
}
</script>

<template>
	<DialogContent
		:force-mount="forceMount"
		:trap-focus="trapFocus"
		:disable-outside-pointer-events="disableOutsidePointerEvents"
		:class="[$style.content, sizeClass]"
		@escape-key-down="emit('escapeKeyDown', $event)"
		@interact-outside="handleInteractOutside"
		@open-auto-focus="emit('openAutoFocus', $event)"
		@close-auto-focus="emit('closeAutoFocus', $event)"
	>
		<!-- Fallback accessible title for screen readers when DialogTitle is not provided -->
		<VisuallyHidden v-if="needsFallbackTitle" as-child>
			<DialogTitle>{{ ariaLabel }}</DialogTitle>
		</VisuallyHidden>

		<!-- Fallback accessible description for screen readers when DialogDescription is not provided -->
		<VisuallyHidden v-if="needsFallbackDescription" as-child>
			<DialogDescription>{{ ariaDescription }}</DialogDescription>
		</VisuallyHidden>

		<slot />

		<N8nDialogClose v-if="showCloseButton" />
	</DialogContent>
</template>

<style module lang="scss">
@keyframes dialogFadeIn {
	from {
		opacity: 0;
		transform: translate(-50%, calc(-50% + var(--spacing--2xs))) scale(0.98);
	}
	to {
		opacity: 1;
		transform: translate(-50%, -50%);
	}
}

@keyframes dialogFadeOut {
	from {
		opacity: 1;
		transform: translate(-50%, -50%);
	}
	to {
		opacity: 0;
		transform: translate(-50%, calc(-50% + var(--spacing--2xs))) scale(0.98);
	}
}

.content {
	position: fixed;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	width: 100%;
	padding: var(--spacing--lg);
	border-radius: var(--radius--lg);
	background-color: light-dark(var(--color--neutral-white), var(--color--neutral-800));
	box-shadow:
		inset 0 1.5px 0 light-dark(transparent, var(--border-color)),
		0 0 0 0.5px light-dark(var(--border-color), var(--color--black-alpha-300)),
		0 8px 8px light-dark(var(--color--black-alpha-100), var(--color--black-alpha-300)),
		0 32px 32px light-dark(var(--color--black-alpha-100), var(--color--black-alpha-200)),
		0 64px 64px light-dark(rgba(0, 0, 0, 0.06), var(--color--black-alpha-100));
	z-index: 1950; // See APP_Z_INDEXES in useStyles.ts
	max-width: var(--dialog--max-width);

	&:focus {
		outline: none;
	}
}

.content[data-state='open'] {
	animation: dialogFadeIn var(--animation--duration--snappy) ease-out;
}

.content[data-state='closed'] {
	animation: dialogFadeOut var(--animation--duration--snappy) ease-out;
}

.small {
	--dialog--max-width: calc(100dvw - var(--spacing--lg));

	@media (min-width: 640px) {
		--dialog--max-width: 360px;
	}
}

.medium {
	--dialog--max-width: calc(100dvw - var(--spacing--lg));

	@media (min-width: 640px) {
		--dialog--max-width: 480px;
	}
}

.large {
	--dialog--max-width: calc(100dvw - var(--spacing--lg));

	@media (min-width: 640px) {
		--dialog--max-width: 564px;
	}
}

.xlarge {
	--dialog--max-width: calc(100dvw - var(--spacing--lg));

	@media (min-width: 640px) {
		--dialog--max-width: 640px;
	}
}

.\32xlarge {
	--dialog--max-width: calc(100dvw - var(--spacing--lg));

	@media (min-width: 640px) {
		--dialog--max-width: 780px;
	}
}

.fit {
	--dialog--max-width: calc(100dvw - var(--spacing--lg));
	width: fit-content;
}

.full {
	--dialog--max-width: calc(100dvw - var(--spacing--lg));
}

.cover {
	width: 100%;
	height: 100%;
	max-width: calc(100dvw - var(--spacing--lg));
	max-height: calc(100dvh - var(--spacing--lg));
}
</style>

<style lang="scss">
/* Workaround: reka-ui DismissableLayer sets pointer-events: none on body,
   which breaks Element Plus poppers teleported to body.
   TODO: Remove once Element Plus components are migrated to Reka UI. */
.el-popper {
	pointer-events: auto;
}
</style>
