<script setup lang="ts">
import { useZIndex } from 'element-plus';
import {
	TooltipContent,
	TooltipPortal,
	TooltipProvider,
	TooltipRoot,
	TooltipTrigger,
} from 'reka-ui';
import { computed, nextTick, onBeforeUnmount, ref, useAttrs, watch } from 'vue';

import type { N8nTooltipProps } from './Tooltip.types';
import { useInjectTooltipAppendTo } from '../../composables/useTooltipAppendTo';
import { n8nHtml as vN8nHtml } from '../../directives';
import N8nButton from '../N8nButton';

defineOptions({
	name: 'N8nTooltip',
	inheritAttrs: false,
});

const attrs = useAttrs();

const props = withDefaults(defineProps<N8nTooltipProps>(), {
	asChild: false,
	placement: 'top',
	showAfter: 0,
	enterable: true,
	teleported: true,
	offset: 8,
	buttons: () => [],
	justifyButtons: 'flex-end',
	avoidCollisions: true,
	focusContent: false,
});

// Get append-to target from composable, defaulting to body for proper z-index stacking
const injectedAppendTo = useInjectTooltipAppendTo();
const appendTo = computed(() => injectedAppendTo.value ?? 'body');

type Side = 'top' | 'bottom' | 'left' | 'right';
type Align = 'start' | 'end' | 'center';

const VALID_SIDES: Side[] = ['top', 'bottom', 'left', 'right'];
const VALID_ALIGNS: Align[] = ['start', 'end', 'center'];

const isSide = (value: string): value is Side => VALID_SIDES.includes(value as Side);
const isAlign = (value: string): value is Align => VALID_ALIGNS.includes(value as Align);

const placementParts = computed(() => {
	const [sideValue, alignValue] = props.placement.split('-');
	return {
		side: isSide(sideValue) ? sideValue : 'top',
		align: isAlign(alignValue) ? alignValue : 'center',
	};
});

// Reka UI handles enterable behavior via disableHoverableContent prop
const disableHoverableContent = computed(() => !props.enterable);

// Handle controlled visibility
const isOpen = ref(false);
const { nextZIndex } = useZIndex();
const zIndex = ref<number>();

watch(
	() => props.visible,
	(newVisible) => {
		if (newVisible !== undefined) {
			isOpen.value = newVisible;
		}
	},
	{ immediate: true },
);

watch(
	isOpen,
	(open) => {
		// Allocate on each open so tooltips stay above Element Plus menus.
		if (open) zIndex.value = nextZIndex();
	},
	{ immediate: true },
);

// Determine if we're in controlled mode
const isControlled = computed(() => props.visible !== undefined);

// `focusContent` owns the open state so a tab into the tooltip does not dismiss it.
const interactiveOpen = ref(false);
const holdOpenForContent = ref(false);
const triggerEl = ref<HTMLElement>();
const contentInnerRef = ref<HTMLElement>();

const openBinding = computed(() => {
	if (isControlled.value) return isOpen.value;
	if (props.focusContent) return interactiveOpen.value;
	return undefined;
});

const TABBABLE_SELECTOR =
	'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]';

function tabbableElements(root: ParentNode): HTMLElement[] {
	return [...root.querySelectorAll<HTMLElement>(TABBABLE_SELECTOR)].filter((element) => {
		if (element.tabIndex < 0) return false;
		if (element.getAttribute('aria-hidden') === 'true') return false;
		if (element.closest('[hidden]')) return false;
		return true;
	});
}

function rememberTrigger(event: Event) {
	if (event.currentTarget instanceof HTMLElement) {
		triggerEl.value = event.currentTarget;
	}
}

function releaseContentFocus() {
	holdOpenForContent.value = false;
	isOpen.value = false;
	interactiveOpen.value = false;
}

function focusAfterTrigger() {
	const trigger = triggerEl.value;
	if (!trigger) return;
	const content = contentInnerRef.value;
	const elements = tabbableElements(document.body);
	const index = elements.indexOf(trigger);
	for (const candidate of elements.slice(index + 1)) {
		if (content?.contains(candidate)) continue;
		candidate.focus();
		return;
	}
}

function onTriggerKeydown(event: KeyboardEvent) {
	rememberTrigger(event);
	if (!props.focusContent || event.key !== 'Tab' || event.shiftKey) return;
	const content = contentInnerRef.value;
	const target = content ? tabbableElements(content)[0] : undefined;
	if (!target) return;
	event.preventDefault();
	holdOpenForContent.value = true;
	target.focus();
}

function onContentKeydown(event: KeyboardEvent) {
	if (!props.focusContent || !holdOpenForContent.value) return;
	if (event.key === 'Escape') {
		event.preventDefault();
		const trigger = triggerEl.value;
		releaseContentFocus();
		trigger?.focus();
		return;
	}
	if (event.key !== 'Tab') return;
	const content = contentInnerRef.value;
	const target = event.target;
	if (!content || !(target instanceof HTMLElement)) return;
	const items = tabbableElements(content);
	const first = items[0];
	const last = items[items.length - 1];
	if (!event.shiftKey && target === last) {
		event.preventDefault();
		const trigger = triggerEl.value;
		releaseContentFocus();
		void nextTick(() => {
			if (trigger) focusAfterTrigger();
		});
		return;
	}
	if (event.shiftKey && target === first) {
		event.preventDefault();
		holdOpenForContent.value = false;
		triggerEl.value?.focus();
	}
}

// A click outside the trigger and the tooltip ends the keyboard visit.
function onDocumentFocusIn(event: FocusEvent) {
	if (!holdOpenForContent.value) return;
	const target = event.target;
	if (!(target instanceof Node)) return;
	if (contentInnerRef.value?.contains(target)) return;
	if (triggerEl.value === target || triggerEl.value?.contains(target)) return;
	releaseContentFocus();
}

watch(
	() => props.focusContent,
	(enabled) => {
		document.removeEventListener('focusin', onDocumentFocusIn);
		if (enabled) document.addEventListener('focusin', onDocumentFocusIn);
	},
	{ immediate: true },
);

onBeforeUnmount(() => {
	document.removeEventListener('focusin', onDocumentFocusIn);
});

const handleOpenChange = (open: boolean) => {
	// Ignore the dismiss that fires when focus moves from the trigger into the tooltip.
	// A later focus outside the trigger and the tooltip clears the hold.
	if (!open && holdOpenForContent.value) return;
	isOpen.value = open;
	if (!isControlled.value) interactiveOpen.value = open;
};
</script>

<template>
	<TooltipProvider>
		<TooltipRoot
			:disabled="disabled"
			:delay-duration="showAfter"
			:open="openBinding"
			:disable-hoverable-content="disableHoverableContent"
			@update:open="handleOpenChange"
		>
			<TooltipTrigger
				v-if="asChild"
				as-child
				v-bind="attrs"
				:class="{ [$style.disabledTrigger]: disabled && !asChild }"
				@focus="rememberTrigger"
				@keydown="onTriggerKeydown"
			>
				<slot />
			</TooltipTrigger>
			<TooltipTrigger
				v-else
				as="span"
				:class="{ [$style.disabledTrigger]: disabled }"
				@focus="rememberTrigger"
				@keydown="onTriggerKeydown"
			>
				<slot />
			</TooltipTrigger>
			<TooltipPortal :to="teleported ? appendTo : undefined" :disabled="!teleported">
				<TooltipContent
					data-test-id="tooltip-content"
					:class="['n8n-tooltip', contentClass]"
					:style="{ '--tooltip--z': zIndex }"
					:side="placementParts.side"
					:align="placementParts.align"
					:side-offset="offset"
					:avoid-collisions="avoidCollisions"
					:collision-padding="8"
				>
					<!-- The wrapper keeps the tooltip layout. It also receives Tab from a link inside. -->
					<div ref="contentInnerRef" :class="$style.focusContent" @keydown="onContentKeydown">
						<slot name="content">
							<span v-n8n-html="content ?? ''" />
						</slot>
						<div
							v-if="buttons.length"
							:class="$style.buttons"
							:style="{ justifyContent: justifyButtons }"
						>
							<N8nButton
								v-for="button in buttons"
								:key="button.attrs.label"
								v-bind="{ ...button.attrs, ...button.listeners }"
							/>
						</div>
					</div>
				</TooltipContent>
			</TooltipPortal>
		</TooltipRoot>
	</TooltipProvider>
</template>

<style lang="scss" module>
.buttons {
	display: flex;
	align-items: center;
	margin-top: var(--spacing--sm);
	gap: var(--spacing--2xs);
}

// No box, so the tooltip content stays a direct flex item of the tooltip.
.focusContent {
	display: contents;
}

.disabledTrigger {
	pointer-events: none;

	> * {
		pointer-events: auto;
	}
}

// Global styles for teleported tooltip content
:global(.n8n-tooltip) {
	z-index: var(--tooltip--z);
	max-width: 180px;
	padding: var(--spacing--4xs) var(--spacing--3xs);
	min-height: var(--height--sm);
	max-height: var(--reka-tooltip-content-available-height);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--md);
	border-radius: var(--radius--xs);
	background: var(--color--neutral-black);
	color: var(--color--neutral-100);
	box-shadow: var(--shadow--sm);
	overflow-wrap: anywhere;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-direction: column;
	transform-origin: var(--reka-tooltip-content-transform-origin);
	text-wrap: pretty;

	svg {
		fill: currentColor;
		opacity: 0.7;
	}
}

:global(.n8n-tooltip[data-state='closed']) {
	animation: none;
}
</style>
