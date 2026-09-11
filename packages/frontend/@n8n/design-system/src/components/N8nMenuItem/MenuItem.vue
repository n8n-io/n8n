<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import type { IMenuItem } from '../../types';
import N8nActionPill from '../N8nActionPill/ActionPill.vue';
import N8nIcon from '../N8nIcon';
import type { IconName } from '../N8nIcon/icons';
import N8nRoute from '../N8nRoute';
import N8nTag from '../N8nTag';
import N8nText from '../N8nText';
import N8nTooltip from '../N8nTooltip';
import PreviewTag from '../PreviewTag/PreviewTag.vue';

const props = defineProps<{
	item: IMenuItem;
	active?: boolean;
	empty?: boolean;
	compact?: boolean;
	level?: number;
	open?: boolean;
	ariaLabel?: string;
	scrollLabelOnOverflow?: boolean;
}>();

const emit = defineEmits<{
	click: [];
}>();

const menuItemTextViewport = ref<HTMLElement | null>(null);
const isLabelOverflowing = ref(false);
let labelResizeObserver: ResizeObserver | undefined;

const updateLabelOverflow = () => {
	const viewport = menuItemTextViewport.value;
	isLabelOverflowing.value =
		Boolean(props.scrollLabelOnOverflow) &&
		viewport !== null &&
		viewport.scrollWidth > viewport.clientWidth;
};

onMounted(() => {
	void nextTick(() => {
		updateLabelOverflow();

		if (typeof ResizeObserver !== 'undefined' && menuItemTextViewport.value) {
			labelResizeObserver = new ResizeObserver(updateLabelOverflow);
			labelResizeObserver.observe(menuItemTextViewport.value);
		}
	});
});

watch(
	() => [props.item.label, props.scrollLabelOnOverflow],
	async () => await nextTick(updateLabelOverflow),
);

onBeforeUnmount(() => labelResizeObserver?.disconnect());

const to = computed(() => {
	if (props.item.disabled) {
		return undefined;
	}

	if (props.item.route) {
		return props.item.route.to;
	}

	if (props.item.link) {
		return props.item.link.href;
	}

	return undefined;
});

const handleClick = () => {
	if (props.item.disabled) {
		return;
	}
	emit('click');
};

const icon = computed<IconName | (string & {}) | undefined>(() => {
	if (typeof props.item.icon === 'object' && props.item.icon?.type === 'icon') {
		return props.item.icon.value;
	}

	if (typeof props.item.icon === 'string') {
		return props.item.icon;
	}

	return undefined;
});

const iconColor = computed(() => {
	// If the icon is a string, we use the default color
	if (typeof props.item.icon === 'string') {
		return undefined;
	}

	return props.item.icon?.color;
});

const tooltipDisabled = computed(() => {
	return !props.compact && !(props.item.disabled && props.item.disabledReason);
});

const tooltipContent = computed(() => {
	if (props.item.disabled && props.item.disabledReason) {
		return props.item.disabledReason;
	}

	if (props.compact) {
		return props.item.label;
	}

	return undefined;
});

const tooltipPlacement = computed(() => {
	return props.item.disabled && props.item.disabledReason ? 'top' : 'right';
});
</script>

<template>
	<div :data-test-id="item.id" :class="$style.menuItemWrapper">
		<N8nTooltip :placement="tooltipPlacement" :disabled="tooltipDisabled" :show-after="500">
			<template #content>
				{{ tooltipContent }}
			</template>

			<N8nRoute
				:id="item.id"
				:to="to"
				role="menuitem"
				:class="[
					$style.menuItem,
					{
						[$style.active]: active,
						[$style.compact]: compact,
						[$style.disabled]: item.disabled,
						[$style.clipOverflowLabel]: props.scrollLabelOnOverflow,
					},
				]"
				:aria-label="props.ariaLabel ?? props.item.label"
				:aria-disabled="item.disabled"
				data-test-id="menu-item"
				@click="handleClick"
			>
				<div
					v-if="item.icon"
					:class="[$style.menuItemIcon, { [$style.notification]: item.notification }]"
				>
					<N8nText
						v-if="item.icon && typeof item.icon === 'object' && item.icon.type === 'emoji'"
						:class="$style.menuItemEmoji"
						>{{ item.icon.value }}</N8nText
					>
					<N8nIcon v-else-if="icon" :color="iconColor" :icon="icon" />
				</div>
				<div :class="$style.menuItemLabel">
					<div
						v-if="!compact"
						ref="menuItemTextViewport"
						:class="[
							$style.menuItemTextViewport,
							{
								[$style.scrollLabelOnOverflow]: props.scrollLabelOnOverflow,
								[$style.labelOverflowing]: isLabelOverflowing,
							},
						]"
					>
						<N8nText
							:class="$style.menuItemText"
							:color="item.disabled ? 'text-light' : 'text-dark'"
						>
							{{ item.label }}
						</N8nText>
					</div>
					<PreviewTag v-if="!compact && item.preview" />
					<N8nTag
						v-if="!compact && item.new"
						:clickable="false"
						text="New"
						:class="$style.newTag"
					/>
					<N8nActionPill v-if="!compact && item.creditsTag" size="small" :text="item.creditsTag" />
				</div>
				<N8nIcon v-if="item.children && !compact" icon="chevron-right" color="text-light" />
			</N8nRoute>
		</N8nTooltip>
	</div>
</template>

<style lang="scss" module>
@use '../../css/mixins/mixins' as scroll-mask;
@use '../../css/mixins/motion' as motion;

.menuItemWrapper {
	position: relative;
	width: 100%;
	max-width: 100%;
	margin-bottom: var(--spacing--5xs);
}

.menuItem {
	display: flex;
	align-items: center;
	justify-content: center;
	// Match the height of items with icons (24px icon + 2 * 4px padding), so
	// icon-less items (e.g. modal sidebar tabs) don't render shorter.
	min-height: var(--spacing--xl);
	padding: var(--spacing--4xs);
	gap: var(--spacing--4xs);
	cursor: pointer;
	color: var(--color--text);
	border-radius: var(--spacing--4xs);
	cursor: pointer;
	min-width: 0;
	width: 100%;
	position: relative;

	&:hover:not(.disabled) .menuItemIcon {
		color: var(--color--text--shade-1);
	}

	&:global(.router-link-active),
	&.active {
		background-color: var(--color--background--light-1);
	}

	&:hover:not(.active):not(:global(.router-link-active)):not(.disabled) {
		background-color: var(--color--background--light-1);
		color: var(--color--text--shade-1);
	}

	&.compact {
		gap: 0;
	}
}

.menuItem:focus-visible {
	outline: 1px solid var(--color--secondary);
	outline-offset: -1px;
}

.menuItem.disabled {
	cursor: not-allowed;
}

.clipOverflowLabel {
	overflow: hidden;
}

.menuItemTextViewport {
	flex: 1;
	min-width: 0;
	white-space: nowrap;
	text-overflow: ellipsis;
	overflow: hidden;
}

.menuItemText {
	display: block;
	line-height: var(--font-size--lg);
	min-width: 0;
}

.scrollLabelOnOverflow {
	container-type: inline-size;
	margin-inline-end: calc(var(--spacing--4xs) * -1);

	.menuItemText {
		display: inline-block;
		max-width: none;
		transition: transform 0s linear;
		@include motion.reduced-motion;
	}
}

.labelOverflowing {
	@include scroll-mask.scroll-mask(right);
}

@media (hover: hover) and (pointer: fine) {
	.menuItem:hover .scrollLabelOnOverflow.labelOverflowing {
		text-overflow: clip;
		animation: revealLeftOverflowFade 0s var(--duration--base) forwards;
		@include motion.reduced-motion;

		.menuItemText {
			transform: translateX(min(0px, calc(-100% + 100cqi)));
			transition-duration: calc(var(--duration--slowest) + var(--duration--slowest));
			transition-delay: var(--duration--base);
			transition-timing-function: linear;
		}
	}
}

@media (prefers-reduced-motion: reduce) {
	.menuItem:hover .scrollLabelOnOverflow.labelOverflowing {
		@include scroll-mask.scroll-mask(right);

		.menuItemText {
			transform: none;
		}
	}
}

@keyframes revealLeftOverflowFade {
	to {
		@include scroll-mask.scroll-mask(x);
	}
}

.menuItemText * {
	color: var(--color--text);
}

.menuItemIcon {
	position: relative;
	width: var(--spacing--lg);
	height: var(--spacing--lg);
	min-width: var(--spacing--lg);
	display: flex;
	align-items: center;
	justify-content: center;

	&.notification::after {
		content: '';
		position: absolute;
		top: 0;
		right: 0;
		width: var(--spacing--4xs);
		height: var(--spacing--4xs);
		background-color: var(--color--danger);
		border-radius: 50%;
	}
}

.menuItemEmoji {
	font-size: var(--spacing--sm);
	line-height: 1;
}

.menuItem.active {
	.menuItemIcon {
		color: var(--color--text--shade-1);
	}
}

.menuItemLabel {
	display: flex;
	align-items: center;
	flex-direction: row;
	gap: var(--spacing--3xs);
	flex: 1;
	min-width: 0;
}

.newTag {
	background-color: var(--color--foreground--shade-2);
	color: var(--color--background);
	border-color: var(--color--foreground--shade-2);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	padding: var(--spacing--5xs) var(--spacing--4xs);
	border-radius: var(--spacing--sm);
	min-height: auto;
	height: auto;
	line-height: 1;
}
</style>
