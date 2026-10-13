<script lang="ts" setup>
import { computed } from 'vue';

import { useI18n } from '../../../composables/useI18n';
import RcLearnLink from '../motion/RcLearnLink.vue';
import type { ListCardData } from '../ResultCard.types';
import { isSafeHref, stagger } from '../utils';

/**
 * List: a handful of items as quiet rows, each with a tone-coloured key, an
 * optional subtitle and meta, and a chevron link when the item has one.
 */
const props = defineProps<{ card: ListCardData; animated: boolean }>();
const { t } = useI18n();

const MAX_ITEMS = 4;
const shownItems = computed(() => props.card.items.slice(0, MAX_ITEMS));
const remaining = computed(() =>
	Math.max(0, (props.card.total ?? props.card.items.length) - shownItems.value.length),
);
</script>

<template>
	<div :class="$style.list" data-test-id="result-card-list">
		<ol :class="$style.items">
			<li
				v-for="(item, index) in shownItems"
				:key="index"
				:class="[$style.item, $style.reveal]"
				:style="{ '--rc-delay': stagger(index, 0.1, 0.07) }"
			>
				<span :class="$style.key" aria-hidden="true" />
				<span :class="$style.text">
					<span :class="$style.title">{{ item.title }}</span>
					<span v-if="item.subtitle" :class="$style.subtitle">{{ item.subtitle }}</span>
				</span>
				<span v-if="item.meta" :class="$style.meta">{{ item.meta }}</span>
				<RcLearnLink
					v-if="isSafeHref(item.href)"
					:href="item.href"
					:label="t('resultCard.list.open')"
					:class="$style.open"
				/>
			</li>
		</ol>
		<p v-if="remaining > 0" :class="[$style.more, $style.chrome]" style="--rc-delay: 0.5s">
			{{ t('resultCard.more', { count: String(remaining) }) }}
		</p>
	</div>
</template>

<style lang="scss" module>
.list {
	display: flex;
	flex-direction: column;
	gap: 4px;
	padding: 4px 16px 0;
}
.items {
	display: flex;
	flex-direction: column;
	gap: 0;
	margin: 0;
	padding: 0;
	list-style: none;
}
.item {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 6px 8px;
	border-radius: 10px;
	transition: background-color var(--rc-tip-dur, 150ms) var(--rc-tip-ease);
}
@media (hover: hover) and (pointer: fine) {
	.item:hover {
		background: var(--rc-gray-hover);
	}
}
.key {
	flex: none;
	width: 8px;
	height: 8px;
	border-radius: 3px;
	background: var(--rc-tone);
}
.text {
	display: flex;
	flex: 1;
	min-width: 0;
	flex-direction: column;
}
.title {
	font-size: 13px;
	line-height: 20px;
	color: var(--rc-fg);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.subtitle {
	font-size: 12px;
	line-height: 16px;
	color: var(--rc-muted);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.meta {
	flex: none;
	font-size: 12px;
	line-height: 16px;
	font-variant-numeric: tabular-nums;
	color: var(--rc-muted);
}
.open {
	margin-right: -4px;
}
.more {
	margin: 2px 0 0 26px;
	font-size: 12px;
	line-height: 16px;
	color: var(--rc-muted);
}

/* entrance */
@keyframes rc-pop {
	from {
		opacity: 0;
		transform: translateY(8px);
		filter: blur(4px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
		filter: blur(0);
	}
}
@keyframes rc-fade {
	from {
		opacity: 0;
	}
	to {
		opacity: 1;
	}
}
.reveal,
.chrome {
	opacity: 1;
}
:global(.rc-animated) .reveal {
	animation: rc-pop var(--rc-enter-dur, 500ms) var(--rc-ease-smooth-out) both;
	animation-delay: var(--rc-delay, 0s);
}
:global(.rc-animated) .chrome {
	animation: rc-fade var(--rc-enter-dur, 500ms) var(--rc-ease-smooth-out) both;
	animation-delay: var(--rc-delay, 0s);
}
@media (prefers-reduced-motion: reduce) {
	:global(.rc-animated) .reveal,
	:global(.rc-animated) .chrome {
		animation: rc-fade 0.2s ease both;
		animation-delay: 0s;
	}
	.item {
		transition: none;
	}
}
</style>
