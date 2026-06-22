<script setup lang="ts">
import {
	HoverCardContent,
	type HoverCardContentProps,
	HoverCardPortal,
	HoverCardRoot,
	type HoverCardRootProps,
	HoverCardTrigger,
	type ReferenceElement,
} from 'reka-ui';
import { computed, watch } from 'vue';

import N8nScrollArea from '../N8nScrollArea/N8nScrollArea.vue';

defineOptions({ name: 'N8nHoverCard' });

interface Props
	extends Pick<HoverCardRootProps, 'open' | 'defaultOpen' | 'openDelay' | 'closeDelay'>,
		Pick<
			HoverCardContentProps,
			| 'side'
			| 'align'
			| 'sideOffset'
			| 'alignOffset'
			| 'avoidCollisions'
			| 'collisionPadding'
			| 'sideFlip'
			| 'forceMount'
		> {
	/** Disables opening the hover card. */
	disabled?: boolean;
	/** Custom reference element for shared/virtual positioning patterns. */
	reference?: ReferenceElement;
	/** Hover card max content width. */
	maxWidth?: string;
	/** Hover card max content height. */
	maxHeight?: string;
	/** Whether to wrap content in N8nScrollArea. */
	enableScrolling?: boolean;
	/** Whether to teleport the hover card to the body element. */
	teleported?: boolean;
	/** Additional class name set on HoverCardContent. */
	contentClass?: string;
	/** Additional class name set on HoverCardTrigger. */
	triggerClass?: string;
	/** Whether to render the trigger slot as the trigger element. */
	triggerAsChild?: boolean;
	/** Renders an inert hidden trigger for reference-based/shared patterns. */
	hideTrigger?: boolean;
}

interface Emits {
	(event: 'update:open', value: boolean): void;
	(event: 'before-enter'): void;
	(event: 'after-leave'): void;
}

const props = withDefaults(defineProps<Props>(), {
	open: undefined,
	defaultOpen: undefined,
	openDelay: 600,
	closeDelay: 0,
	disabled: false,
	side: 'bottom',
	align: 'center',
	sideOffset: 4,
	alignOffset: undefined,
	avoidCollisions: true,
	collisionPadding: 5,
	sideFlip: undefined,
	reference: undefined,
	maxWidth: undefined,
	maxHeight: undefined,
	enableScrolling: false,
	forceMount: false,
	teleported: true,
	contentClass: undefined,
	triggerClass: undefined,
	triggerAsChild: true,
	hideTrigger: false,
});

const emit = defineEmits<Emits>();

const rootOpen = computed(() => (props.disabled ? false : props.open));

const contentStyle = computed(() => ({
	maxWidth: props.maxWidth,
	zIndex: 999,
}));

function handleOpenUpdate(open: boolean) {
	if (props.disabled && open) return;
	emit('update:open', open);
}

function close() {
	emit('update:open', false);
}

watch(
	() => rootOpen.value,
	(newOpen, oldOpen) => {
		if (newOpen && !oldOpen) {
			emit('before-enter');
		} else if (!newOpen && oldOpen) {
			emit('after-leave');
		}
	},
);
</script>

<template>
	<HoverCardRoot
		:open="rootOpen"
		:default-open="defaultOpen"
		:open-delay="openDelay"
		:close-delay="closeDelay"
		@update:open="handleOpenUpdate"
	>
		<HoverCardTrigger
			:as-child="triggerAsChild && !hideTrigger"
			:class="[triggerClass, { [$style.hiddenTrigger]: hideTrigger }]"
		>
			<span v-if="hideTrigger" aria-hidden="true" />
			<slot v-else name="trigger" />
		</HoverCardTrigger>
		<HoverCardPortal :disabled="!teleported">
			<HoverCardContent
				:side="side"
				:align="align"
				:side-offset="sideOffset"
				:align-offset="alignOffset"
				:avoid-collisions="avoidCollisions"
				:collision-padding="collisionPadding"
				:side-flip="sideFlip"
				:reference="reference"
				:force-mount="forceMount"
				:class="[$style.hoverCardContent, contentClass]"
				:style="contentStyle"
			>
				<N8nScrollArea
					v-if="enableScrolling"
					:max-height="maxHeight"
					type="hover"
					:enable-vertical-scroll="true"
					:enable-horizontal-scroll="false"
				>
					<slot name="content" :close="close" />
				</N8nScrollArea>
				<template v-else>
					<slot name="content" :close="close" />
				</template>
			</HoverCardContent>
		</HoverCardPortal>
	</HoverCardRoot>
</template>

<style lang="scss" module>
@use '../../css/mixins/motion';

.hiddenTrigger {
	display: none;
}

.hoverCardContent {
	--hover-card--offset--slide-x: 0;
	--hover-card--offset--slide-y: 0;
	--hover-card--offset--origin-x: center;
	--hover-card--offset--origin-y: center;
	--animation--popover-in--translate-x: var(--hover-card--offset--slide-x);
	--animation--popover-in--translate-y: var(--hover-card--offset--slide-y);

	border-radius: var(--radius--xs);
	background-color: var(--background--surface);
	box-shadow:
		var(--shadow--md),
		inset var(--shadow--outline);
	will-change: transform, opacity;
	transform-origin: var(--hover-card--offset--origin-x) var(--hover-card--offset--origin-y);

	&[data-state='open'] {
		@include motion.popover-in;
	}

	&[data-state='closed'] {
		display: none;
	}
}

.hoverCardContent[data-state='open'][data-side='top'] {
	--hover-card--offset--slide-y: -2px;
	--hover-card--offset--origin-y: bottom;
}

.hoverCardContent[data-state='open'][data-side='right'] {
	--hover-card--offset--slide-x: 2px;
	--hover-card--offset--origin-x: left;
}

.hoverCardContent[data-state='open'][data-side='bottom'] {
	--hover-card--offset--slide-y: 2px;
	--hover-card--offset--origin-y: top;
}

.hoverCardContent[data-state='open'][data-side='left'] {
	--hover-card--offset--slide-x: -2px;
	--hover-card--offset--origin-x: right;
}

.hoverCardContent[data-state='open'][data-side='top'][data-align='start'],
.hoverCardContent[data-state='open'][data-side='bottom'][data-align='start'] {
	--hover-card--offset--slide-x: -2px;
	--hover-card--offset--origin-x: left;
}

.hoverCardContent[data-state='open'][data-side='top'][data-align='end'],
.hoverCardContent[data-state='open'][data-side='bottom'][data-align='end'] {
	--hover-card--offset--slide-x: 2px;
	--hover-card--offset--origin-x: right;
}

.hoverCardContent[data-state='open'][data-side='left'][data-align='start'],
.hoverCardContent[data-state='open'][data-side='right'][data-align='start'] {
	--hover-card--offset--slide-y: -2px;
	--hover-card--offset--origin-y: top;
}

.hoverCardContent[data-state='open'][data-side='left'][data-align='end'],
.hoverCardContent[data-state='open'][data-side='right'][data-align='end'] {
	--hover-card--offset--slide-y: 2px;
	--hover-card--offset--origin-y: bottom;
}
</style>
