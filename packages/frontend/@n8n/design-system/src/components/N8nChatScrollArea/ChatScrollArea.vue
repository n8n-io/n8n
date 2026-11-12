<script setup lang="ts">
import { useIntersectionObserver, useResizeObserver } from '@vueuse/core';
import { nextTick, onMounted, ref, useTemplateRef, watch } from 'vue';

import { useI18n } from '../../composables/useI18n';
import N8nIconButton from '../N8nIconButton';
import type {
	ChatScrollAreaEmits,
	ChatScrollAreaExposed,
	ChatScrollAreaProps,
	ChatScrollAreaSlots,
	ScrollAnchorSnapshot,
} from './ChatScrollArea.types';
import {
	AT_BOTTOM_THRESHOLD_PX,
	LOAD_OLDER_ROOT_MARGIN,
	getAnchoredScrollTop,
	scrollToBottom,
	takeScrollSnapshot,
} from './ChatScrollArea.utils';
import N8nTooltip from '../N8nTooltip';

defineOptions({ name: 'N8nChatScrollArea' });

const props = withDefaults(defineProps<ChatScrollAreaProps>(), {
	follow: true,
	loadingOlder: false,
});

const emit = defineEmits<ChatScrollAreaEmits>();

defineSlots<ChatScrollAreaSlots>();

const { t } = useI18n();

const viewport = useTemplateRef<HTMLElement>('viewport');
const content = useTemplateRef<HTMLElement>('content');
const topSentinel = useTemplateRef<HTMLElement>('topSentinel');
const bottomSentinel = useTemplateRef<HTMLElement>('bottomSentinel');
const inputOverlay = useTemplateRef<HTMLElement>('inputOverlay');

const isAtBottom = ref(true);
const inputHeight = ref(0);
let anchorSnapshot: ScrollAnchorSnapshot | undefined;

useIntersectionObserver(
	bottomSentinel,
	([entry]) => {
		const value = entry?.isIntersecting ?? false;
		if (value === isAtBottom.value) return;
		isAtBottom.value = value;
		emit('update:atBottom', value);
	},
	{ root: viewport, rootMargin: `0px 0px ${AT_BOTTOM_THRESHOLD_PX}px 0px` },
);

useIntersectionObserver(
	topSentinel,
	([entry]) => {
		if (!entry?.isIntersecting || props.loadingOlder) return;
		emit('load-older');
	},
	{ root: viewport, rootMargin: LOAD_OLDER_ROOT_MARGIN },
);

/** Keeps the bottom in view when content grows and the user is at the bottom. */
useResizeObserver(content, () => {
	if (!viewport.value || !props.follow || !isAtBottom.value) return;
	scrollToBottom(viewport.value);
});

useResizeObserver(inputOverlay, ([entry]) => {
	inputHeight.value = entry?.borderBoxSize?.[0]?.blockSize ?? entry?.contentRect.height ?? 0;
});

watch(
	() => props.loadingOlder,
	async (loading, wasLoading) => {
		if (!viewport.value) return;
		if (loading) {
			anchorSnapshot = takeScrollSnapshot(viewport.value);
			return;
		}
		if (wasLoading && anchorSnapshot) {
			await nextTick();
			viewport.value.scrollTop = getAnchoredScrollTop(anchorSnapshot, viewport.value.scrollHeight);
			anchorSnapshot = undefined;
		}
	},
);

/** Scrolls smoothly to the bottom. Following starts again when the bottom is visible. */
function onScrollToBottom(behaviour: ScrollBehavior = 'smooth') {
	if (!viewport.value) return;
	scrollToBottom(viewport.value, behaviour);
}

const exposed: ChatScrollAreaExposed = { scrollToBottom: () => onScrollToBottom('auto') };
defineExpose(exposed);

/**
 * Measures the input before the first jump, so the spacer has its final
 * height and the last message is not hidden under the input.
 */
onMounted(async () => {
	if (inputOverlay.value) inputHeight.value = inputOverlay.value.offsetHeight;
	await nextTick();
	if (viewport.value) scrollToBottom(viewport.value);
});
</script>

<template>
	<div
		:class="$style.chatScrollArea"
		:style="{ '--chat--input--height': `${inputHeight}px` }"
		data-test-id="chat-scroll-area"
	>
		<div
			ref="viewport"
			:class="$style.viewport"
			tabindex="0"
			role="region"
			:aria-label="t('chatScrollArea.messages')"
			data-test-id="chat-scroll-area-viewport"
		>
			<div ref="topSentinel" :class="$style.sentinel" aria-hidden="true" />
			<div ref="content">
				<slot />
			</div>
			<div :class="$style.spacer" aria-hidden="true" />
			<div ref="bottomSentinel" :class="$style.sentinel" aria-hidden="true" />
		</div>
		<div ref="inputOverlay" :class="$style.inputOverlay">
			<Transition
				:enter-active-class="$style.scrollDownButtonEnter"
				:leave-active-class="$style.scrollDownButtonLeave"
			>
				<div v-if="!isAtBottom" :class="$style.scrollDown">
					<N8nTooltip :content="t('chatScrollArea.scrollToBottom')">
						<N8nIconButton
							icon="arrow-down"
							variant="solid"
							:class="$style.scrollDownButton"
							:aria-label="t('chatScrollArea.scrollToBottom')"
							data-test-id="chat-scroll-area-scroll-down"
							@click="onScrollToBottom('smooth')"
						/>
					</N8nTooltip>
				</div>
			</Transition>
			<slot name="input" />
		</div>
	</div>
</template>

<style lang="scss" module>
@use '../../css/mixins/focus';
@use '../../css/mixins/motion';

.chatScrollArea {
	position: relative;
	height: 100%;
	width: 100%;
	overflow: hidden;
}

.viewport {
	height: 100%;
	width: 100%;
	overflow-y: auto;
	overflow-anchor: none;
	outline: none;

	&:focus-visible {
		@include focus.focus-ring;
		outline-offset: calc(-1 * var(--focus--border-width));
	}
	/**
	 * Fades content just above the input.
	 * The `scroll-mask` mixin only fades at the edge, so the offset needs a custom mask.
	 */
	--chat--fade--end: calc(100% - var(--chat--input--height, 0px));
	mask-image: linear-gradient(
		to bottom,
		black 0,
		black calc(var(--chat--fade--end) - var(--spacing--xl)),
		transparent var(--chat--fade--end)
	);
}

.sentinel {
	height: 1px;
	overflow-anchor: auto;
}

.spacer {
	height: var(--chat--input--height, 0);
}

.inputOverlay {
	position: absolute;
	right: 0;
	bottom: 0;
	left: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--xs);
	pointer-events: none;

	> * {
		pointer-events: auto;
	}
}

/**
 * Sits above the overlay, so it does not change the measured input height.
 * Centered with auto margins because the motion keyframes own `transform`.
 */
.scrollDown {
	position: absolute;
	right: 0;
	bottom: 100%;
	left: 0;
	width: fit-content;
	margin: 0 auto var(--spacing--xs);

	.scrollDownButton {
		box-shadow: var(--shadow--xs);
	}
}

.scrollDownButtonEnter {
	@include motion.fade-in-up;
}

.scrollDownButtonLeave {
	@include motion.fade-out-down;
}
</style>
