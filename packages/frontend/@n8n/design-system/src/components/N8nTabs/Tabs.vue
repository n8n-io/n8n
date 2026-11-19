<script lang="ts" setup generic="Value extends string | number">
import { usePreferredReducedMotion } from '@vueuse/core';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';

import { useI18n } from '../../composables/useI18n';
import type { TabOptions } from '../../types';
import N8nBadge from '../N8nBadge';
import N8nIcon from '../N8nIcon';
import N8nTooltip from '../N8nTooltip';
import PreviewBadge from '../PreviewBadge/PreviewBadge.vue';
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from './reka-ui';
import type { TabsProps } from './Tabs.types';

const props = withDefaults(defineProps<TabsProps<Value>>(), {
	modelValue: undefined,
	options: () => [],
	size: 'medium',
	justified: false,
	orientation: 'horizontal',
});

const emit = defineEmits<{
	tooltipClick: [tab: Value, e: MouseEvent];
	'update:modelValue': [tab: Value];
}>();

defineSlots<{
	default?: () => unknown;
	content?: (props: { value: Value }) => unknown;
}>();

const { t } = useI18n();
const reducedMotion = usePreferredReducedMotion();
const scrollPosition = ref(0);
const canScrollRight = ref(false);
const hasOverflow = ref(false);
const root = ref<HTMLDivElement>();
const tabsList = ref<InstanceType<typeof TabsList>>();
let resizeObserver: ResizeObserver | null = null;

/** Link options navigate, so they stay out of the roving-focus tab list. */
function isLinkOption(option: TabOptions<Value>) {
	return Boolean((option.href || option.to) && !option.disabled);
}

const triggerOptions = computed(() => props.options.filter((option) => !isLinkOption(option)));
const linkOptions = computed(() => props.options.filter(isLinkOption));

function getTabsElement(): HTMLElement | undefined {
	const element: unknown = tabsList.value?.$el;
	return element instanceof HTMLElement ? element : undefined;
}

function isDestructive(option: TabOptions<Value>) {
	return option.isDestructive === true;
}

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
watch(() => [props.options, props.justified, props.size, props.orientation], updateScrollState, {
	deep: true,
	flush: 'post',
});

function handleTooltipClick(tab: Value, event: MouseEvent) {
	emit('tooltipClick', tab, event);
}

/** Map the Reka value back to the option, so the emitted value keeps the `Value` type. */
function handleUpdate(value: string | number) {
	const option = props.options.find((item) => item.value === value);
	if (!option || option.disabled) return;
	emit('update:modelValue', option.value);
}

function handleLinkClick(option: TabOptions<Value>) {
	if (option.disabled) return;
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
			:class="[
				'n8n-tabs',
				$style.container,
				size === 'small' ? $style.small : '',
				size === 'large' ? $style.large : '',
				justified ? $style.justified : '',
				orientation === 'vertical' ? $style.vertical : '',
			]"
		>
			<!-- Scroll buttons stay outside TabsList, so arrow-key focus skips them. -->
			<button
				v-if="hasOverflow"
				type="button"
				:class="$style.button"
				:aria-label="t('tabs.scrollLeft')"
				:disabled="scrollPosition <= 1"
				@click="scroll('left')"
			>
				<N8nIcon icon="chevron-left" size="small" />
			</button>
			<TabsList ref="tabsList" :class="$style.tabs" @focusin="handleFocusIn">
				<div
					v-for="option in triggerOptions"
					:id="option.value.toString()"
					:key="option.value"
					:data-test-id="`tab-${option.value.toString()}`"
					:class="{ [$style.alignRight]: option.align === 'right' }"
				>
					<N8nTooltip :disabled="!option.tooltip" placement="bottom" :show-after="100" as-child>
						<template #content>
							<div v-n8n-html="option.tooltip" @click="handleTooltipClick(option.value, $event)" />
						</template>
						<TabsTrigger
							:value="option.value"
							:disabled="option.disabled"
							:class="{
								[$style.tab]: true,
								[$style.noText]: !option.label,
								[$style.destructive]: isDestructive(option),
							}"
						>
							<N8nIcon
								v-if="option.icon && option.iconPosition !== 'right'"
								:icon="option.icon"
								:class="$style.icon"
								size="small"
							/>
							<span v-if="option.label" :class="$style.notificationContainer">
								{{ option.label }}
								<div v-if="option.notification" :class="$style.notification" />
							</span>
							<N8nIcon
								v-if="option.icon && option.iconPosition === 'right'"
								:icon="option.icon"
								:class="$style.icon"
								size="small"
							/>
							<PreviewBadge v-if="option.preview" :class="$style.badge" />
							<N8nBadge v-if="option.tag" :class="$style.badge">{{ option.tag }}</N8nBadge>
						</TabsTrigger>
					</N8nTooltip>
				</div>
			</TabsList>
			<div v-if="linkOptions.length" :class="$style.links">
				<div
					v-for="option in linkOptions"
					:id="option.value.toString()"
					:key="option.value"
					:data-test-id="`tab-${option.value.toString()}`"
				>
					<N8nTooltip :disabled="!option.tooltip" placement="bottom" :show-after="100">
						<template #content>
							<div v-n8n-html="option.tooltip" @click="handleTooltipClick(option.value, $event)" />
						</template>
						<a
							v-if="option.href"
							target="_blank"
							:href="option.href"
							rel="noopener noreferrer"
							:class="[$style.tab, option.label ? '' : $style.noText]"
							@click="handleLinkClick(option)"
						>
							<div :class="$style.externalLinkContent">
								{{ option.label }}
								<N8nIcon
									:class="$style.external"
									:icon="option.icon ?? 'external-link'"
									size="small"
								/>
								<PreviewBadge v-if="option.preview" :class="$style.badge" />
								<N8nBadge v-if="option.tag" :class="$style.badge">{{ option.tag }}</N8nBadge>
							</div>
						</a>
						<RouterLink
							v-else-if="option.to"
							:to="option.to"
							:class="[
								$style.tab,
								{ [$style.activeTab]: modelValue === option.value, [$style.noText]: !option.label },
							]"
						>
							<N8nIcon v-if="option.icon" :icon="option.icon" size="medium" />
							<span v-if="option.label">{{ option.label }}</span>
							<PreviewBadge v-if="option.preview" :class="$style.badge" />
							<N8nBadge v-if="option.tag" :class="$style.badge">{{ option.tag }}</N8nBadge>
						</RouterLink>
					</N8nTooltip>
				</div>
			</div>
			<button
				v-if="hasOverflow"
				type="button"
				:class="$style.button"
				:aria-label="t('tabs.scrollRight')"
				:disabled="!canScrollRight"
				@click="scroll('right')"
			>
				<N8nIcon icon="chevron-right" size="small" />
			</button>
		</div>

		<TabsContent v-if="$slots.content && modelValue !== undefined" :value="modelValue">
			<slot name="content" :value="modelValue" />
		</TabsContent>

		<slot />
	</TabsRoot>
</template>

<style lang="scss" module>
@use '../../css/mixins/focus';

.container {
	--tabs--height: var(--height--md);
	--tabs--tab--padding: 0 var(--spacing--sm);
	--tabs--tab--gap: var(--spacing--4xs);
	--tabs--font-size: var(--font-size--sm);
	--tabs--indicator--width: 2px;

	position: relative;
	display: flex;
	align-items: stretch;
	min-height: var(--tabs--height);
	width: 100%;

	&.small {
		--tabs--height: var(--height--sm);
		--tabs--tab--padding: 0 var(--spacing--xs);
		--tabs--font-size: var(--font-size--2xs);
	}

	&.large {
		--tabs--height: var(--height--lg);
		--tabs--tab--padding: 0 var(--spacing--md);
		--tabs--font-size: var(--font-size--md);
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

	> div {
		display: flex;
		flex-shrink: 0;
	}

	/** Hide the scrollbar without removing native scrolling. */
	&::-webkit-scrollbar {
		display: none;
	}
}

.tab {
	--tabs--tab--color: var(--text-color--subtle);
	--tabs--tab--color--hover: var(--color--primary);
	--tabs--tab--color--active: var(--color--primary);
	--tabs--indicator--color: transparent;

	appearance: none;
	display: flex;
	align-items: center;
	gap: var(--tabs--tab--gap);
	padding: var(--tabs--tab--padding);
	border: var(--border-width) solid transparent;
	background: transparent;
	font-family: inherit;
	font-size: var(--tabs--font-size);
	font-weight: var(--font-weight--medium);
	line-height: 1;
	white-space: nowrap;
	text-decoration: none;
	color: var(--tabs--tab--color);
	cursor: pointer;
	/** The indicator is a shadow, so the active state does not change the layout. */
	box-shadow: inset 0 calc(-1 * var(--tabs--indicator--width)) 0 var(--tabs--indicator--color);

	&:hover {
		color: var(--tabs--tab--color--hover);
	}

	&:focus {
		outline: none;
	}

	&:focus-visible {
		@include focus.focus-ring-with-border;
		outline-offset: calc(-1 * var(--focus--border-width));
	}

	&[data-state='active'],
	&.activeTab {
		--tabs--tab--color: var(--tabs--tab--color--active);
		--tabs--indicator--color: var(--tabs--tab--color--active);
	}

	&.destructive {
		--tabs--tab--color: var(--color--danger);
		--tabs--tab--color--hover: var(--color--danger);
		--tabs--tab--color--active: var(--color--danger);
	}

	&[data-disabled],
	&:disabled {
		--tabs--tab--color: var(--text-color--disabled);
		--tabs--tab--color--hover: var(--text-color--disabled);
		--tabs--indicator--color: transparent;
		cursor: not-allowed;
	}
}

.badge {
	flex-shrink: 0;
}

/** Equal slots keep label changes from moving adjacent tabs. */
.justified {
	.tabs > div {
		flex: 1 1 0;
		min-width: 0;
	}

	.tab {
		flex: 1;
		justify-content: center;
		min-width: 0;
	}

	/** Reserve space for the notification dot inside the truncated label. */
	.notificationContainer {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		padding-right: 0.5em;
	}

	.notification {
		right: 0;
	}
}

.links {
	display: flex;
	align-items: stretch;
	flex-shrink: 0;
}

/** Vertical tabs stack and mark the active tab on the leading edge. */
.vertical {
	flex-direction: column;

	.tabs,
	.links {
		flex-direction: column;
		overflow-x: visible;
	}

	.tab {
		min-height: var(--tabs--height);
		box-shadow: inset var(--tabs--indicator--width) 0 0 var(--tabs--indicator--color);
	}
}

.alignRight:not(.alignRight + .alignRight) {
	margin-left: auto;
}

.externalLinkContent {
	display: flex;
	align-items: center;
	gap: var(--tabs--tab--gap);
}

.noText .icon,
.noText .external {
	display: block;
}

.button {
	composes: tab;
	flex: 0 0 var(--spacing--xl);
	justify-content: center;
	padding-inline: 0;
	background: var(--tabs--arrow-buttons--color, transparent);

	&:disabled {
		cursor: default;
	}
}

.notificationContainer {
	display: flex;
	position: relative;
}

.notification {
	display: flex;
	position: absolute;
	right: -0.5em;
	align-items: center;
	justify-content: center;

	&::after {
		content: '';
		display: block;
		height: 0.3em;
		width: 0.3em;
		background-color: var(--color--primary);
		border-radius: 50%;
	}
}
</style>
