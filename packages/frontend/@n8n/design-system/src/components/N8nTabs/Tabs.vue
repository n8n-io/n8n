<script lang="ts" setup generic="Value extends string | number">
import { usePreferredReducedMotion } from '@vueuse/core';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';

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
	modelValue: undefined,
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
const scrollPosition = ref(0);
const canScrollRight = ref(false);
const hasOverflow = ref(false);
const root = ref<HTMLDivElement>();
const tabsList = ref<InstanceType<typeof TabsList>>();
let resizeObserver: ResizeObserver | null = null;

/** Route options render as links, but keep their place and focus order in the tab list. */
function isLinkOption(option: TabOptions<Value>) {
	return Boolean(option.to && !option.disabled);
}

function getTabsElement(): HTMLElement | undefined {
	const element: unknown = tabsList.value?.$el;
	return element instanceof HTMLElement ? element : undefined;
}

/** The shared indicator cannot read the colour of the active tab, so it gets the state here. */
const activeOption = computed(() =>
	props.options.find((option) => option.value === props.modelValue),
);

function updateScrollState() {
	const container = getTabsElement();
	if (!container) return;

	scrollPosition.value = container.scrollLeft;
	canScrollRight.value = container.scrollWidth - container.clientWidth - container.scrollLeft > 1;
	/** Compare against the full row to keep reserved controls stable at both ends. */
	hasOverflow.value =
		!props.justified &&
		props.orientation === 'horizontal' &&
		container.scrollWidth > (root.value?.clientWidth ?? 0);
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
	resizeObserver = new ResizeObserver(updateScrollState);
	resizeObserver.observe(container);
	if (root.value) resizeObserver.observe(root.value);
	updateScrollState();
});

onUnmounted(() => {
	getTabsElement()?.removeEventListener('scroll', updateScrollState);
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
		:model-value="modelValue"
		:orientation="orientation"
		activation-mode="manual"
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
				:disabled="scrollPosition <= 1"
				@click="scroll('left')"
			>
				<N8nIcon icon="chevron-left" size="small" />
			</button>
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
							<div v-n8n-html="option.tooltip" @click="handleTooltipClick(option.value, $event)" />
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
								size="small"
							/>
							<N8nText :size="size" bold :class="$style.label">{{ option.label }}</N8nText>
							<N8nIcon
								v-if="option.icon && option.iconPosition === 'right'"
								:icon="option.icon"
								:color="option.iconColor"
								:class="$style.icon"
								size="small"
							/>
							<PreviewBadge v-if="option.preview" :class="$style.badge" />
							<N8nBadge v-if="option.tag" :class="$style.badge">{{ option.tag }}</N8nBadge>
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
			<div v-if="$slots.suffix" :class="$style.suffix">
				<slot name="suffix" />
			</div>
		</div>

		<TabsContent v-if="$slots.content && modelValue !== undefined" :value="modelValue">
			<slot name="content" :value="modelValue" />
		</TabsContent>

		<slot />
	</TabsRoot>
</template>

<style lang="scss" module>
@use '../../css/mixins/focus';
@use '../../css/mixins/motion';
@use '../../css/mixins/utils';

.container {
	--n8n-tabs--height: var(--height--md);
	--n8n-tabs--tab--padding: 0 var(--spacing--sm);
	--n8n-tabs--tab--gap: var(--spacing--4xs);
	--n8n-tabs--font-size: var(--font-size--sm);
	--n8n-tabs--indicator--width: 2px;
	--n8n-tabs--indicator--duration: var(--duration--snappy);
	--n8n-tabs--indicator--easing: var(--easing--ease-out-quart);

	position: relative;
	display: flex;
	align-items: stretch;
	min-height: var(--n8n-tabs--height);
	width: 100%;

	&.small {
		--n8n-tabs--height: var(--height--sm);
		--n8n-tabs--tab--padding: 0 var(--spacing--xs);
		--n8n-tabs--font-size: var(--font-size--2xs);
	}

	&.large {
		--n8n-tabs--height: var(--height--lg);
		--n8n-tabs--tab--padding: 0 var(--spacing--md);
		--n8n-tabs--font-size: var(--font-size--md);
	}
}

.tabs {
	display: flex;
	align-items: stretch;
	flex: 1;
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
	gap: var(--n8n-tabs--tab--gap);
	padding: var(--n8n-tabs--tab--padding);
	border-radius: var(--radius);
	border: var(--border-width) solid transparent;
	background: transparent;
	font-family: inherit;
	font-size: var(--n8n-tabs--font-size);
	font-weight: var(--font-weight--medium);
	line-height: 1;
	white-space: nowrap;
	text-decoration: none;
	color: var(--n8n-tabs--tab--color);
	cursor: pointer;

	&:hover {
		color: var(--n8n-tabs--tab--color--hover);
	}

	&:focus {
		outline: none;
	}

	&:focus-visible {
		@include focus.focus-ring-with-border;
		outline-offset: calc(-1 * var(--focus--border-width));
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
	transform: translateX(var(--reka-tabs-indicator-position));
	background-color: var(--color--primary);
	pointer-events: none;
	transition:
		transform var(--n8n-tabs--indicator--duration) var(--n8n-tabs--indicator--easing),
		width var(--n8n-tabs--indicator--duration) var(--n8n-tabs--indicator--easing);
	@include motion.reduced-motion;
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

	.tab {
		min-height: var(--n8n-tabs--height);
	}

	.indicator {
		top: 0;
		bottom: auto;
		width: var(--n8n-tabs--indicator--width);
		height: var(--reka-tabs-indicator-size);
		transform: translateY(var(--reka-tabs-indicator-position));
		transition:
			transform var(--n8n-tabs--indicator--duration) var(--n8n-tabs--indicator--easing),
			height var(--n8n-tabs--indicator--duration) var(--n8n-tabs--indicator--easing);
		@include motion.reduced-motion;
	}
}

/**
 * The filled variant stretches the shared indicator over the active tab,
 * so the background moves between tabs like the underline does.
 */
.filled {
	.tabs {
		gap: var(--spacing--5xs);
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
		bottom: 0;
		height: auto;
		border-radius: var(--radius);
		background-color: var(--background--hover);
	}

	&.vertical .indicator {
		left: 0;
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
