<script lang="ts" setup generic="Value extends string | number">
import { usePreferredReducedMotion } from '@vueuse/core';
import { computed, getCurrentInstance, onMounted, onUnmounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';

import { useHorizontalScrollEdges } from '../../composables/useHorizontalScrollEdges';
import { useI18n } from '../../composables/useI18n';
import type { TabOptions } from '../../types';
import N8nBadge from '../N8nBadge';
import N8nIcon from '../N8nIcon';
import N8nText from '../N8nText';
import N8nTooltip from '../N8nTooltip';
import PreviewBadge from '../PreviewBadge/PreviewBadge.vue';
import { TabsContent, TabsIndicator, TabsList, TabsRoot, TabsTrigger } from './reka-ui';
import type { TabsProps } from './Tabs.types';

const props = withDefaults(defineProps<TabsProps<Value>>(), {
	options: () => [],
	size: 'medium',
	justified: false,
	orientation: 'horizontal',
	variant: 'underline',
});

const emit = defineEmits<{
	tooltipClick: [tab: Value, e: MouseEvent];
	'update:modelValue': [tab: Value];
}>();

defineSlots<{
	default?: () => unknown;
	content?: (props: { value: Value }) => unknown;
	/** Content after the tab list, such as related actions or links. */
	suffix?: () => unknown;
}>();

const { t } = useI18n();
const reducedMotion = usePreferredReducedMotion();
const vnodeProps = getCurrentInstance()?.vnode.props ?? {};
const isModelControlled = 'modelValue' in vnodeProps || 'model-value' in vnodeProps;
const internalValue = ref<Value | undefined>(props.defaultValue);
const selectedValue = computed(() => (isModelControlled ? props.modelValue : internalValue.value));
/**
 * Automatic activation reports the focused tab and the click in one turn.
 * Ignore the repeat. A later choice can report again.
 */
const reportedValue = ref<Value | undefined>();
const hasOverflow = ref(false);
const root = ref<HTMLDivElement>();
const suffix = ref<HTMLDivElement>();
const tabsList = ref<InstanceType<typeof TabsList>>();
let resizeObserver: ResizeObserver | null = null;

/** Keys that move within the tab list. Tab enters and leaves the bar. */
const ROVING_KEYS = new Set([
	'ArrowLeft',
	'ArrowRight',
	'ArrowUp',
	'ArrowDown',
	'Home',
	'End',
	'PageUp',
	'PageDown',
]);

/** Route options render as links, but keep their place and focus order in the tab list. */
function isLinkOption(option: TabOptions<Value>) {
	return Boolean(option.to && !option.disabled);
}

function getTabsElement(): HTMLElement | undefined {
	const element: unknown = tabsList.value?.$el;
	return element instanceof HTMLElement ? element : undefined;
}

const tabsElement = computed(() => getTabsElement() ?? null);
const {
	canScrollLeft,
	canScrollRight,
	update: updateScrollEdges,
} = useHorizontalScrollEdges(tabsElement);

/** Large tabs use the large icon. Smaller tabs keep the small icon. */
const iconSize = computed(() => (props.size === 'large' ? 'large' : 'small'));

/** The shared indicator cannot read the colour of the active tab, so it gets the state here. */
const activeOption = computed(() =>
	props.options.find((option) => option.value === selectedValue.value),
);

function updateScrollState() {
	updateScrollEdges();
	const container = getTabsElement();
	if (!container) return;

	/**
	 * Compare against the row minus the suffix. The arrows do not count, so the
	 * reserved controls stay stable when they appear.
	 */
	const available = (root.value?.clientWidth ?? 0) - (suffix.value?.offsetWidth ?? 0);
	hasOverflow.value =
		!props.justified && props.orientation === 'horizontal' && container.scrollWidth > available;
}

/**
 * Fade the edge that still has tabs out of view.
 * The mask is on the viewport, so it stays on the visible edge.
 */
const fadeEdge = computed(() => {
	if (!hasOverflow.value) return undefined;
	if (canScrollLeft.value && canScrollRight.value) return 'both';
	if (canScrollLeft.value) return 'left';
	if (canScrollRight.value) return 'right';
	return undefined;
});

/**
 * Arrow keys select the next tab, so the selection is the cue.
 * Hide the ring for that move. Tabbing in, and a return to this window, show it again.
 */
function handleKeydown(event: KeyboardEvent) {
	const element = root.value;
	if (!element) return;
	if (ROVING_KEYS.has(event.key)) {
		element.dataset.focusSource = 'arrow';
		return;
	}
	if (event.key === 'Tab') delete element.dataset.focusSource;
}

function clearArrowFocus() {
	if (root.value) delete root.value.dataset.focusSource;
}

/** Keep the tab that receives roving focus inside the visible area. */
function handleFocusIn(event: FocusEvent) {
	if (!(event.target instanceof HTMLElement)) return;
	event.target.scrollIntoView({
		block: 'nearest',
		inline: 'nearest',
		behavior: reducedMotion.value === 'reduce' ? 'instant' : 'smooth',
	});
}

onMounted(() => {
	const container = getTabsElement();
	if (!container) return;

	container.addEventListener('scroll', updateScrollState);
	root.value?.addEventListener('keydown', handleKeydown, true);
	root.value?.addEventListener('pointerdown', clearArrowFocus);
	window.addEventListener('blur', clearArrowFocus);
	resizeObserver = new ResizeObserver(updateScrollState);
	resizeObserver.observe(container);
	if (root.value) resizeObserver.observe(root.value);
	updateScrollState();
});

onUnmounted(() => {
	getTabsElement()?.removeEventListener('scroll', updateScrollState);
	root.value?.removeEventListener('keydown', handleKeydown, true);
	root.value?.removeEventListener('pointerdown', clearArrowFocus);
	window.removeEventListener('blur', clearArrowFocus);
	resizeObserver?.disconnect();
});

/**
 * The observer only fires when the container itself resizes. Options that
 * arrive or change label after mount grow scrollWidth without touching it, so
 * the arrows would otherwise stay hidden until the next mount.
 */
watch(
	() => [props.options, props.justified, props.size, props.orientation, props.variant],
	updateScrollState,
	{
		deep: true,
		flush: 'post',
	},
);

function handleTooltipClick(tab: Value, event: MouseEvent) {
	emit('tooltipClick', tab, event);
}

/** Map the Reka value back to the option, so the emitted value keeps the `Value` type. */
function handleUpdate(value: string | number) {
	const option = props.options.find((item) => item.value === value);
	/** The router changes the page for route options, so the consumer does not get a selection. */
	if (!option || option.disabled || isLinkOption(option)) return;
	if (option.value === selectedValue.value || option.value === reportedValue.value) return;
	reportedValue.value = option.value;
	queueMicrotask(() => {
		reportedValue.value = undefined;
	});
	if (!isModelControlled) internalValue.value = option.value;
	emit('update:modelValue', option.value);
}

function scroll(direction: 'left' | 'right') {
	const container = getTabsElement();
	if (!container) return;

	const viewport = container.getBoundingClientRect();
	const items = Array.from(container.children);
	if (direction === 'left') items.reverse();

	for (const item of items) {
		const bounds = item.getBoundingClientRect();
		const distance =
			direction === 'right' ? bounds.right - viewport.right : bounds.left - viewport.left;
		if (direction === 'right' ? distance > 1 : distance < -1) {
			/** Keep the middle of an oversized tab reachable in both directions. */
			const step = Math.max(-container.clientWidth, Math.min(distance, container.clientWidth));
			container.scrollTo({
				left: container.scrollLeft + step,
				behavior: reducedMotion.value === 'reduce' ? 'instant' : 'smooth',
			});
			return;
		}
	}
}
</script>

<template>
	<TabsRoot
		:model-value="selectedValue"
		:orientation="orientation"
		activation-mode="automatic"
		@update:model-value="handleUpdate"
	>
		<div
			ref="root"
			:class="{
				'n8n-tabs': true,
				[$style.container]: true,
				[$style.small]: size === 'small',
				[$style.large]: size === 'large',
				[$style.justified]: justified,
				[$style.vertical]: orientation === 'vertical',
				[$style.filled]: variant === 'filled',
			}"
		>
			<button
				v-if="hasOverflow"
				type="button"
				:class="$style.arrowButton"
				:aria-label="t('tabs.scrollLeft')"
				:disabled="!canScrollLeft"
				@click="scroll('left')"
			>
				<N8nIcon icon="chevron-left" size="small" />
			</button>
			<div :class="$style.viewport" :data-fade="fadeEdge">
				<TabsList ref="tabsList" :class="$style.tabs" @focusin="handleFocusIn">
					<div
						v-for="option in options"
						:id="option.value.toString()"
						:key="option.value"
						:data-test-id="`tab-${option.value.toString()}`"
						:class="{
							[$style.tabItem]: true,
							[$style.alignRight]: option.align === 'right',
						}"
					>
						<N8nTooltip :disabled="!option.tooltip" placement="bottom" :show-after="100" as-child>
							<template #content>
								<div
									v-n8n-html="option.tooltip"
									@click="handleTooltipClick(option.value, $event)"
								/>
							</template>
							<TabsTrigger
								:value="option.value"
								:disabled="option.disabled"
								:as="isLinkOption(option) ? RouterLink : 'button'"
								:to="isLinkOption(option) ? option.to : undefined"
								:class="$style.tab"
							>
								<N8nIcon
									v-if="option.icon && option.iconPosition !== 'right'"
									:icon="option.icon"
									:color="option.iconColor"
									:class="$style.icon"
									:size="iconSize"
								/>
								<N8nText :size="size" bold :class="$style.label">{{ option.label }}</N8nText>
								<N8nIcon
									v-if="option.icon && option.iconPosition === 'right'"
									:icon="option.icon"
									:color="option.iconColor"
									:class="$style.icon"
									:size="iconSize"
								/>
								<PreviewBadge v-if="option.preview" :class="$style.badge" />
								<N8nBadge v-if="option.tag" size="xxsmall" :class="$style.badge">
									{{ option.tag }}
								</N8nBadge>
								<span
									v-if="option.notification"
									:class="$style.notification"
									data-test-id="tab-notification"
									aria-hidden="true"
								/>
							</TabsTrigger>
						</N8nTooltip>
					</div>
					<TabsIndicator
						:class="{
							[$style.indicator]: true,
							[$style.indicatorHidden]: !activeOption || !!activeOption.disabled,
						}"
					/>
				</TabsList>
			</div>
			<button
				v-if="hasOverflow"
				type="button"
				:class="$style.arrowButton"
				:aria-label="t('tabs.scrollRight')"
				:disabled="!canScrollRight"
				@click="scroll('right')"
			>
				<N8nIcon icon="chevron-right" size="small" />
			</button>
			<div v-if="$slots.suffix" ref="suffix" :class="$style.suffix">
				<slot name="suffix" />
			</div>
		</div>

		<TabsContent v-if="$slots.content && selectedValue !== undefined" :value="selectedValue">
			<slot name="content" :value="selectedValue" />
		</TabsContent>

		<slot />
	</TabsRoot>
</template>

<style lang="scss" module>
@use '../../css/mixins/focus';
@use '../../css/mixins/mixins';
@use '../../css/mixins/motion';
@use '../../css/mixins/utils';

.container {
	--n8n-tabs--height: var(--height--md);
	--n8n-tabs--tab--padding-x: var(--spacing--sm);
	--n8n-tabs--tab--padding-y: 0;
	--n8n-tabs--tab--gap: var(--spacing--4xs);
	--n8n-tabs--list--gap: 0;
	--n8n-tabs--indicator--width: 2px;
	--n8n-tabs--indicator--duration: var(--duration--snappy);
	--n8n-tabs--indicator--easing: var(--easing--ease-out-quart);
	--n8n-tabs--fade-size: var(--spacing--2xl);

	position: relative;
	display: flex;
	min-height: var(--n8n-tabs--height);
	width: 100%;

	&.small {
		--n8n-tabs--height: var(--height--sm);
		--n8n-tabs--tab--padding-x: var(--spacing--xs);
	}

	&.large {
		--n8n-tabs--height: var(--height--lg);
		--n8n-tabs--tab--padding-x: var(--spacing--md);
	}

	/**
	 * Horizontal underline tabs draw a line under the whole bar.
	 * The label has no side padding, so the active bar matches the text.
	 * Equal block padding keeps the label off the top edge and off the line.
	 * The row grows past the control height when the label needs that space.
	 */
	&:not(.vertical):not(.filled) {
		--n8n-tabs--tab--padding-x: 0;
		--n8n-tabs--tab--padding-y: var(--spacing--xs);
		--n8n-tabs--list--gap: var(--spacing--sm);
		/** Room for the ring past the tab. The offset is the gap under the line. */
		--n8n-tabs--focus-outset: calc(var(--spacing--5xs) + var(--focus--border-width));

		&.small {
			--n8n-tabs--tab--padding-y: var(--spacing--2xs);
			--n8n-tabs--list--gap: var(--spacing--xs);
		}

		&.large {
			--n8n-tabs--tab--padding-y: var(--spacing--sm);
			--n8n-tabs--list--gap: var(--spacing--md);
		}

		.tab:not(.arrowButton) {
			border-radius: 0;
		}

		/**
		 * The ring sits outside the tab, and its bottom stroke sits below the line.
		 * Padding keeps that stroke inside the scrollport.
		 * The line stays on the tab edge, so the offset reads as a gap under it.
		 */
		.tabs {
			padding: var(--n8n-tabs--focus-outset);
			scroll-padding: var(--n8n-tabs--focus-outset);
		}

		.indicator {
			bottom: var(--n8n-tabs--focus-outset);
		}

		.arrowButton {
			margin-block: var(--n8n-tabs--focus-outset);
		}

		&::after {
			content: '';
			position: absolute;
			right: 0;
			bottom: var(--n8n-tabs--focus-outset);
			left: 0;
			z-index: 0;
			height: var(--border-width);
			background-color: var(--border-color);
			pointer-events: none;
		}
	}
}

/**
 * The fade sits on this box, not on the scroller.
 * A mask on the scroller follows the full tab row and misses the visible edge.
 */
.viewport {
	display: flex;
	flex: 1;
	min-width: 0;

	&[data-fade='left'] {
		@include mixins.scroll-mask(left, var(--n8n-tabs--fade-size));
	}

	&[data-fade='right'] {
		@include mixins.scroll-mask(right, var(--n8n-tabs--fade-size));
	}

	&[data-fade='both'] {
		@include mixins.scroll-mask(x, var(--n8n-tabs--fade-size));
	}
}

.tabs {
	display: flex;
	flex: 1;
	gap: var(--n8n-tabs--list--gap);
	min-width: 0;
	position: relative;
	overflow-x: auto;
	-ms-overflow-style: none;
	scrollbar-width: none;

	/** Hide the scrollbar without removing native scrolling. */
	&::-webkit-scrollbar {
		display: none;
	}
}

.tab {
	--n8n-tabs--tab--color: var(--text-color--subtle);
	--n8n-tabs--tab--color--hover: var(--color--primary);
	--n8n-tabs--tab--color--active: var(--color--primary);

	appearance: none;
	position: relative;
	display: flex;
	align-items: center;
	text-align: center;
	gap: var(--n8n-tabs--tab--gap);
	min-height: var(--n8n-tabs--height);
	padding: var(--n8n-tabs--tab--padding-y) var(--n8n-tabs--tab--padding-x);
	border-radius: var(--radius);
	border: var(--border-width) solid transparent;
	background: transparent;
	line-height: 1;
	white-space: nowrap;
	color: var(--n8n-tabs--tab--color);
	cursor: pointer;

	&:hover {
		color: var(--n8n-tabs--tab--color--hover);
	}

	&:focus {
		outline: none;
	}

	&:focus-visible {
		@include focus.focus-ring;
	}

	/**
	 * Place the ring outside the tab.
	 * The filled variant keeps the ring used by inputs, flush with the tab edge.
	 */
	.container:not(.filled) &:not(.arrowButton):focus-visible {
		outline-offset: var(--spacing--5xs);
	}

	/**
	 * Arrow keys select the tab, so the bar is the cue.
	 * The ring returns when the user tabs in, or when this window is focused again.
	 */
	.container[data-focus-source='arrow'] &:focus-visible {
		outline: none;
	}

	&[data-state='active'] {
		--n8n-tabs--tab--color: var(--n8n-tabs--tab--color--active);
	}

	&[data-disabled],
	&:disabled {
		--n8n-tabs--tab--color: var(--text-color--disabled);
		--n8n-tabs--tab--color--hover: var(--text-color--disabled);
		cursor: not-allowed;
	}
}

/** One shared bar that moves to the active tab. Reka sets its size and position. */
.indicator {
	position: absolute;
	left: 0;
	bottom: 0;
	width: var(--reka-tabs-indicator-size);
	height: var(--n8n-tabs--indicator--width);
	z-index: 1;
	transform: translateX(var(--reka-tabs-indicator-position));
	background-color: var(--color--primary);
	pointer-events: none;
}

.indicatorHidden {
	display: none;
}

.badge {
	flex-shrink: 0;
}

/** Wraps each trigger so the tooltip and alignment apply to the whole tab. */
.tabItem {
	display: flex;
	flex-shrink: 0;

	/** Equal slots keep label changes from moving adjacent tabs. */
	.justified & {
		flex: 1 1 0;
		min-width: 0;
	}
}

.justified {
	.tab {
		flex: 1;
		justify-content: center;
		min-width: 0;
	}
}

/** Vertical tabs stack and mark the active tab on the leading edge. */
.vertical {
	flex-direction: column;

	.tabs {
		flex-direction: column;
		overflow-x: visible;
	}

	&:not(.filled) .tabs {
		padding: calc(var(--spacing--5xs) + var(--focus--border-width));
		scroll-padding: calc(var(--spacing--5xs) + var(--focus--border-width));
	}

	.indicator {
		top: 0;
		bottom: auto;
		width: var(--n8n-tabs--indicator--width);
		height: var(--reka-tabs-indicator-size);
		transform: translateY(var(--reka-tabs-indicator-position));
	}
}

/**
 * The filled variant stretches the shared indicator over the active tab,
 * so the background moves between tabs like the underline does.
 */
.filled {
	--n8n-tabs--tab--padding-x: var(--spacing--xs);
	--n8n-tabs--list--gap: var(--spacing--5xs);

	&.small {
		--n8n-tabs--tab--padding-x: var(--spacing--2xs);
	}

	&.large {
		--n8n-tabs--tab--padding-x: var(--spacing--sm);
	}

	.tab {
		/**
		 * Keep the tab above the indicator, which now covers the full tab.
		 * Do not position `.tabItem`: Reka measures `offsetLeft` from the tab list.
		 */
		z-index: 1;
		--n8n-tabs--tab--color--hover: var(--text-color);
		--n8n-tabs--tab--color--active: var(--text-color);

		&[data-disabled],
		&:disabled {
			--n8n-tabs--tab--color--hover: var(--text-color--disabled);
		}
	}

	.indicator {
		top: 0;
		height: auto;
		border-radius: var(--radius);
		background-color: var(--background--hover);
		transition:
			transform var(--n8n-tabs--indicator--duration) var(--n8n-tabs--indicator--easing),
			width var(--n8n-tabs--indicator--duration) var(--n8n-tabs--indicator--easing),
			height var(--n8n-tabs--indicator--duration) var(--n8n-tabs--indicator--easing);
		@include motion.reduced-motion;
	}

	/**
	 * The outer focus ring paints past the tab.
	 * Padding keeps that ring inside the horizontal scrollport.
	 * The indicator matches the tab, not the padding.
	 */
	&:not(.vertical) {
		.tabs {
			padding: var(--focus--border-width);
			scroll-padding: var(--focus--border-width);
		}

		.indicator {
			top: var(--focus--border-width);
			bottom: var(--focus--border-width);
		}
	}

	&.vertical .indicator {
		right: 0;
		bottom: auto;
		width: auto;
		height: var(--reka-tabs-indicator-size);
	}
}

.alignRight:not(.alignRight + .alignRight) {
	margin-left: auto;
}

.suffix {
	display: flex;
	align-items: center;
	align-self: center;
	flex-shrink: 0;
}

.arrowButton {
	composes: tab;
	flex: 0 0 var(--spacing--xl);
	justify-content: center;
	padding-inline: 0;
	background: var(--n8n-tabs--arrow-buttons--color, transparent);

	&:disabled {
		cursor: default;
	}
}

.label {
	@include utils.utils-ellipsis;
	min-width: 0;
}

.notification {
	position: absolute;
	top: var(--spacing--3xs);
	right: var(--spacing--3xs);
	width: var(--spacing--4xs);
	height: var(--spacing--4xs);
	border-radius: 50%;
	background-color: var(--n8n-tabs--notification--color, var(--background--brand));
	pointer-events: none;
}
</style>
