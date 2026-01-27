<script setup lang="ts">
import {
	DialogContent,
	DialogClose,
	DialogTitle,
	DialogDescription,
	VisuallyHidden,
} from 'reka-ui';
import { computed, nextTick, onMounted, shallowRef, useCssModule } from 'vue';

import Icon from '@n8n/design-system/components/N8nIcon/Icon.vue';

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
const contentRef = shallowRef<InstanceType<typeof DialogContent> | null>(null);

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

/**
 * NOTE (@heymynameisrob): Check if DialogTitle or DialogDescription components exist in the slot content
 * and warn in dev mode if no accessible title is provided
 */
const checkForAccessibilityComponents = () => {
	const el = contentRef.value?.$el;
	if (!el || !(el instanceof HTMLElement)) return;

	const titleElements = el.querySelectorAll('[id^="reka-dialog-title"]');
	const hasTitleFromSlot = props.ariaLabel ? titleElements.length > 1 : titleElements.length > 0;

	if (import.meta.env.DEV) {
		if (!hasTitleFromSlot && !props.ariaLabel) {
			console.warn(
				'[N8nDialogContent] Dialog is missing accessible title. ' +
					'Either include <N8nDialogTitle> in your dialog content or provide an "ariaLabel" prop.',
			);
		}
	}
};

/** ARIA Fallbacks: These are visually hidden but accessible to screen readers **/
const needsFallbackTitle = computed(() => !!props.ariaLabel);
const needsFallbackDescription = computed(() => !!props.ariaDescription);

onMounted(async () => {
	await nextTick();
	checkForAccessibilityComponents();
});
</script>

<template>
	<Transition name="n8n-dialog-fade">
		<DialogContent
			ref="contentRef"
			:force-mount="forceMount"
			:trap-focus="trapFocus"
			:disable-outside-pointer-events="disableOutsidePointerEvents"
			:class="[$style.content, sizeClass]"
			@escape-key-down="emit('escapeKeyDown', $event)"
			@interact-outside="emit('interactOutside', $event)"
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

			<DialogClose
				v-if="showCloseButton"
				:class="$style['close-button']"
				aria-label="Close dialog"
				data-test-id="dialog-close-button"
			>
				<Icon icon="x" />
			</DialogClose>
		</DialogContent>
	</Transition>
</template>

<style module>
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
	z-index: 999999;
	max-width: var(--dialog--max-width);

	&:focus {
		outline: none;
	}
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

/** TODO (@heymynameisrob): Replace with <Button /> when v2 shipped **/
.close-button {
	position: absolute;
	top: var(--spacing--sm);
	right: var(--spacing--sm);
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: var(--spacing--lg);
	height: var(--spacing--lg);
	padding: 0;
	border: none;
	border-radius: var(--radius);
	background-color: transparent;
	color: var(--color--text);
	cursor: pointer;

	&:hover {
		background-color: var(--color--background);
	}

	&:focus-visible {
		box-shadow: 0 0 0 var(--spacing--5xs) var(--color--primary);
		outline: none;
	}
}

:global(.n8n-dialog-fade-enter-active),
:global(.n8n-dialog-fade-leave-active) {
	--easing--ease-out: cubic-bezier(0.215, 0.61, 0.355, 1);
	transition:
		opacity 0.2s var(--easing--ease-out),
		transform 0.2s var(--easing--ease-out);
	@media (prefers-reduced-motion: reduce) {
		transition: opacity 0.1s;
	}
}
:global(.n8n-dialog-fade-enter-from),
:global(.n8n-dialog-fade-leave-to) {
	opacity: 0;
	transform: translate(-50%, calc(-50% + var(--spacing--2xs))) scale(0.98);
	transform-origin: center;
	@media (prefers-reduced-motion: reduce) {
		transform: translate(-50%, -50%);
	}
}
</style>
