<script lang="ts" setup generic="Value extends string | number">
import { usePreferredReducedMotion } from '@vueuse/core';
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';

import { useI18n } from '../../composables/useI18n';
import type { TabOptions } from '../../types';
import N8nBadge from '../N8nBadge';
import N8nIcon from '../N8nIcon';
import type { TabsProps } from './Tabs.types';
import N8nTooltip from '../N8nTooltip';
import PreviewBadge from '../PreviewBadge/PreviewBadge.vue';

const props = withDefaults(defineProps<TabsProps<Value>>(), {
	modelValue: undefined,
	options: () => [],
	size: 'medium',
	variant: 'legacy',
	justified: false,
});

const { t } = useI18n();
const reducedMotion = usePreferredReducedMotion();
const scrollPosition = ref(0);
const canScrollRight = ref(false);
const hasOverflow = ref(false);
const root = ref<HTMLDivElement>();
const tabs = ref<HTMLDivElement>();
let resizeObserver: ResizeObserver | null = null;

function updateScrollState() {
	const container = tabs.value;
	if (!container) return;

	scrollPosition.value = container.scrollLeft;
	canScrollRight.value = container.scrollWidth - container.clientWidth - container.scrollLeft > 1;
	/** Compare against the full row to keep reserved controls stable at both ends. */
	hasOverflow.value = !props.justified && container.scrollWidth > (root.value?.clientWidth ?? 0);
}

onMounted(() => {
	const container = tabs.value;
	if (!container) return;

	container.addEventListener('scroll', updateScrollState);
	resizeObserver = new ResizeObserver(updateScrollState);
	resizeObserver.observe(container);
	if (root.value) resizeObserver.observe(root.value);
	updateScrollState();
});

onUnmounted(() => {
	tabs.value?.removeEventListener('scroll', updateScrollState);
	resizeObserver?.disconnect();
});

/**
 * The observer only fires when the container itself resizes. Options that
 * arrive or change label after mount grow scrollWidth without touching it, so
 * the arrows would otherwise stay hidden until the next mount.
 */
watch(() => [props.options, props.justified, props.size, props.variant], updateScrollState, {
	deep: true,
	flush: 'post',
});

const emit = defineEmits<{
	tooltipClick: [tab: Value, e: MouseEvent];
	'update:modelValue': [tab: Value];
}>();

function handleTooltipClick(tab: Value, event: MouseEvent) {
	emit('tooltipClick', tab, event);
}

function handleTabClick(option: TabOptions<Value>) {
	if (option.disabled) return;
	emit('update:modelValue', option.value);
}

function scroll(direction: 'left' | 'right') {
	const container = tabs.value;
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
	<div
		ref="root"
		:class="[
			'n8n-tabs',
			$style.container,
			size === 'small' ? $style.small : '',
			variant === 'modern' ? $style.modern : '',
			justified ? $style.justified : '',
		]"
	>
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
		<div ref="tabs" role="tablist" :class="$style.tabs">
			<div
				v-for="option in options"
				:id="option.value.toString()"
				:key="option.value"
				:data-test-id="`tab-${option.value.toString()}`"
				:class="{ [$style.alignRight]: option.align === 'right' }"
			>
				<N8nTooltip :disabled="!option.tooltip" placement="bottom" :show-after="100">
					<template #content>
						<div v-n8n-html="option.tooltip" @click="handleTooltipClick(option.value, $event)" />
					</template>
					<!-- Disabled link/router tabs fall through to the inert plain-tab branch
					     below so they can't navigate and get consistent disabled styling. -->
					<a
						v-if="option.href && !option.disabled"
						target="_blank"
						:href="option.href"
						rel="noopener noreferrer"
						:class="[$style.link, $style.tab, option.label ? '' : $style.noText]"
						@click="() => handleTabClick(option)"
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
						v-else-if="option.to && !option.disabled"
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
					<div
						v-else
						role="tab"
						tabindex="0"
						:aria-selected="modelValue === option.value"
						:class="{
							[$style.tab]: true,
							[$style.activeTab]: modelValue === option.value,
							[$style.noText]: !option.label,
							[$style.dangerTab]: option.variant === 'danger',
							[$style.disabledTab]: option.disabled === true,
						}"
						:aria-disabled="option.disabled || undefined"
						@click="() => handleTabClick(option)"
						@keydown.enter.prevent="() => handleTabClick(option)"
						@keydown.space.prevent="() => handleTabClick(option)"
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
					</div>
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
</template>

<style lang="scss" module>
.container {
	position: relative;
	display: flex;
	align-items: stretch;
	min-height: var(--height--xs);
	width: 100%;

	&.modern {
		/** Modern tabs retain the existing minimum with the two-pixel active border. */
		min-height: calc(var(--height--xs) + var(--spacing--5xs));
	}
}

.tabs {
	color: var(--text-color--subtle);
	font-weight: var(--font-weight--medium);
	display: flex;
	align-items: center;
	flex: 1;
	min-width: 0;
	position: relative;
	overflow-x: auto;

	> div {
		flex-shrink: 0;
	}

	/** Hide the scrollbar without removing native scrolling. */
	&::-webkit-scrollbar {
		display: none;
	}

	-ms-overflow-style: none;
	scrollbar-width: none;

	.small.modern & {
		gap: var(--spacing--xs);
	}
}

.tab {
	--tabs--tab--border-width--active: 2px;
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: 0 var(--spacing--sm);
	padding-bottom: calc(var(--spacing--2xs) + var(--tabs--tab--border-width--active));
	font-size: var(--font-size--sm);

	cursor: pointer;
	white-space: nowrap;
	color: var(--text-color--subtle);
	&:hover {
		color: var(--color--primary);
	}

	/** Keep the focus ring inside the scroll container. */
	&:focus-visible {
		outline: var(--border-width) solid var(--focus--border-color);
		outline-offset: calc(-1 * var(--border-width));
		border-radius: var(--radius--3xs);
	}

	span + span {
		margin-left: var(--spacing--4xs);
	}

	.modern & {
		padding-bottom: calc(var(--spacing--xs) + var(--tabs--tab--border-width--active));
		font-size: var(--font-size--2xs);
		font-weight: var(--font-weight--medium);
	}

	.small & {
		font-size: var(--font-size--2xs);
	}

	.small.modern & {
		padding-inline: 0;
	}

	/**
	 * A badge is taller than the label's line box, so it would sit flush against the
	 * tab's top edge and collide with the inset focus ring.
	 */
	.container:has(.badge) & {
		padding-top: var(--spacing--4xs);
	}
}

.badge {
	flex-shrink: 0;
}

.activeTab {
	color: var(--color--primary);
	padding-bottom: var(--spacing--2xs);
	border-bottom: var(--color--primary) var(--tabs--tab--border-width--active) solid;

	.modern & {
		padding-bottom: var(--spacing--xs);
	}
}

/** Equal slots keep label changes from moving adjacent tabs. */
.justified {
	.tabs > div {
		flex: 1 1 0;
		min-width: 0;
	}

	.tab {
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

.alignRight:not(.alignRight + .alignRight) {
	margin-left: auto;
}

.link {
	cursor: pointer;
	color: var(--text-color--subtle);

	&:hover {
		color: var(--color--primary);
	}
}

.external {
	display: inline-block;
	margin-left: var(--spacing--5xs);

	.noText & {
		display: block;
		margin-left: 0;
	}
}

.externalLinkContent {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);

	.external {
		margin-left: 0;
	}
}

.noText .icon {
	display: block;
}

.dangerTab {
	color: var(--color--danger);

	&:hover {
		color: var(--color--danger);
	}
}

.disabledTab {
	color: var(--text-color--disabled);
	cursor: not-allowed;

	&:hover {
		color: var(--text-color--disabled);
	}
}

.button {
	composes: tab;
	flex: 0 0 var(--spacing--xl);
	justify-content: center;
	padding-inline: 0;
	border: 0;
	background: var(--tabs--arrow-buttons--color, transparent);
	font-family: inherit;
	line-height: inherit;

	/** Match the label line box so the chevron stays centered with the title. */
	&::before {
		content: '\200b';
	}

	&:disabled {
		color: var(--text-color--disabled);
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

	&:after {
		content: '';
		display: block;
		height: 0.3em;
		width: 0.3em;
		background-color: var(--color--primary);
		border-radius: 50%;
	}
}
</style>
