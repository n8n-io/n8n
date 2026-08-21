<script lang="ts" setup generic="Value extends string | number">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';

import type { TabOptions } from '../../types';
import N8nIcon from '../N8nIcon';
import type { TabsProps } from './Tabs.types';
import Tag from '../N8nTag/Tag.vue';
import N8nTooltip from '../N8nTooltip';
import PreviewTag from '../PreviewTag/PreviewTag.vue';

const props = withDefaults(defineProps<TabsProps<Value>>(), {
	modelValue: undefined,
	options: () => [],
	size: 'medium',
	variant: 'legacy',
	justified: false,
});

const scrollPosition = ref(0);
const canScrollRight = ref(false);
const tabs = ref<Element | undefined>(undefined);
let resizeObserver: ResizeObserver | null = null;

const updateScrollState = () => {
	const container = tabs.value;
	if (!container) return;

	scrollPosition.value = container.scrollLeft;
	canScrollRight.value = container.scrollWidth - container.clientWidth > container.scrollLeft;
};

onMounted(() => {
	const container = tabs.value;
	if (!container) return;

	container.addEventListener('scroll', updateScrollState);
	resizeObserver = new ResizeObserver(updateScrollState);
	resizeObserver.observe(container);
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
watch(
	() => props.options,
	async () => {
		await nextTick();
		updateScrollState();
	},
	{ deep: true },
);

const emit = defineEmits<{
	tooltipClick: [tab: Value, e: MouseEvent];
	'update:modelValue': [tab: Value];
}>();

const handleTooltipClick = (tab: Value, event: MouseEvent) => emit('tooltipClick', tab, event);
const handleTabClick = (option: TabOptions<Value>) => {
	if (option.disabled) return;
	emit('update:modelValue', option.value);
};

const scroll = (left: number) => {
	const container = tabs.value;
	if (container) {
		container.scrollBy({ left, top: 0, behavior: 'smooth' });
	}
};
const scrollLeft = () => scroll(-50);
const scrollRight = () => scroll(50);
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
		<div v-if="scrollPosition > 0" :class="$style.back" @click="scrollLeft">
			<N8nIcon :class="$style.positionIcon" icon="chevron-left" size="small" />
		</div>
		<div v-if="canScrollRight" :class="$style.next" @click="scrollRight">
			<N8nIcon :class="$style.positionIcon" icon="chevron-right" size="small" />
		</div>
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
							<PreviewTag v-if="option.preview" />
							<Tag v-if="option.tag" :text="option.tag" :clickable="false" />
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
						<PreviewTag v-if="option.preview" />
						<Tag v-if="option.tag" :text="option.tag" :clickable="false" />
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
						<PreviewTag v-if="option.preview" />
						<Tag v-if="option.tag" :text="option.tag" :clickable="false" />
					</div>
				</N8nTooltip>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	position: relative;
	height: 24px;
	min-height: 24px;
	width: 100%;

	&.modern {
		height: 26px;
		min-height: 26px;
	}
}

.tabs {
	color: var(--text-color--subtle);
	font-weight: var(--font-weight--medium);
	display: flex;
	align-items: center;
	width: 100%;
	position: absolute;
	overflow-x: scroll;

	/* Hide scrollbar for Chrome, Safari and Opera */
	&::-webkit-scrollbar {
		display: none;
	}

	/* Hide scrollbar for IE, Edge and Firefox */
	-ms-overflow-style: none; /* IE and Edge */
	scrollbar-width: none; /* Firefox */

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

	/* Inset outline so the ring isn't clipped by the scroll container and adds no layout shift. */
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
	 * A tag is taller than the label's line box, so it would sit flush against the
	 * tab's top edge and collide with the inset focus ring.
	 */
	.tabs:has(:global(.n8n-tag)) & {
		padding-top: var(--spacing--4xs);
	}
}

.activeTab {
	color: var(--color--primary);
	padding-bottom: var(--spacing--2xs);
	border-bottom: var(--color--primary) var(--tabs--tab--border-width--active) solid;

	.modern & {
		padding-bottom: var(--spacing--xs);
	}
}

// Equal slots rather than natural widths: a tab's own label can then grow or
// shrink — a count going from (0) to (99+) — without nudging its neighbours.
// Slots always add up to the container, so the scroll arrows never engage.
.justified {
	.tabs > div {
		flex: 1 1 0;
		min-width: 0;
	}

	.tab {
		justify-content: center;
		min-width: 0;
	}

	// `overflow: hidden` ellipsises a long label but would also clip the
	// notification dot, which overhangs the box. Reserve its width as padding
	// and pull it back inside so both survive.
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
	color: var(--text-color--subtle--tint-1);
	cursor: not-allowed;

	&:hover {
		color: var(--text-color--subtle--tint-1);
	}
}

.button {
	position: absolute;
	background-color: var(--tabs--arrow-buttons--color, var(--color--foreground--tint-2));
	z-index: 1;
	height: 24px;
	width: 10px;
	display: flex;
	align-items: center;
	font-weight: var(--font-weight--medium);
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

.back {
	composes: tab;
	composes: button;
	left: 0;
}

.next {
	composes: tab;
	composes: button;
	right: 0;
}

.positionIcon {
	flex-shrink: 0;
}
</style>
