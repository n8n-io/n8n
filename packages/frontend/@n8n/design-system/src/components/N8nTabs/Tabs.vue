<script lang="ts" setup generic="Value extends string | number">
import { useResizeObserver } from '@vueuse/core';
import { computed, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';

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

const tabs = ref<HTMLDivElement>();
const canScrollLeft = ref(false);
const canScrollRight = ref(false);
const observedElements = computed(() =>
	tabs.value ? [tabs.value, ...Array.from(tabs.value.children)] : [],
);

function updateScrollState() {
	const container = tabs.value;
	if (!container) return;

	canScrollLeft.value = !props.justified && container.scrollLeft > 1;
	canScrollRight.value =
		!props.justified && container.scrollWidth - container.clientWidth - container.scrollLeft > 1;
}

/** Observe tab sizes too, because labels can grow without resizing the viewport. */
useResizeObserver(observedElements, updateScrollState);
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
</script>

<template>
	<div
		:class="[
			'n8n-tabs',
			$style.container,
			size === 'small' ? $style.small : '',
			variant === 'modern' ? $style.modern : '',
			justified ? $style.justified : '',
		]"
	>
		<div
			ref="tabs"
			role="tablist"
			:class="[
				$style.tabs,
				{ [$style.fadeLeft]: canScrollLeft, [$style.fadeRight]: canScrollRight },
			]"
			@scroll="updateScrollState"
		>
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
	</div>
</template>

<style lang="scss" module>
@use '../../css/mixins/mixins' as scrollMixins;
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

	&.fadeLeft {
		@include scrollMixins.scroll-mask(left);
	}

	&.fadeRight {
		@include scrollMixins.scroll-mask(right);
	}

	&.fadeLeft.fadeRight {
		@include scrollMixins.scroll-mask(x);
	}

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
