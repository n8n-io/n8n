<script lang="ts" setup>
import { computed } from 'vue';

import { useI18n } from '../../../composables/useI18n';
import type { ListCardData } from '../ResultCard.types';
import { isSafeHref, stagger } from '../utils';

const props = defineProps<{ card: ListCardData; light: boolean; animated: boolean }>();
const { t } = useI18n();

const MAX_ITEMS = 4;
const shownItems = computed(() => props.card.items.slice(0, MAX_ITEMS));
const remaining = computed(() =>
	Math.max(0, (props.card.total ?? props.card.items.length) - shownItems.value.length),
);
</script>

<template>
	<div :class="$style.list">
		<ol :class="$style.items">
			<li
				v-for="(item, index) in shownItems"
				:key="index"
				:class="[$style.item, $style.reveal]"
				:style="{ '--rc-delay': stagger(index, 0.3, 0.09) }"
			>
				<span :class="$style.marker" aria-hidden="true" />
				<span :class="$style.text">
					<a
						v-if="isSafeHref(item.href)"
						:href="item.href"
						target="_blank"
						rel="noopener noreferrer"
						:class="$style.title"
						>{{ item.title }}</a
					>
					<span v-else :class="$style.title">{{ item.title }}</span>
					<span v-if="item.subtitle" :class="$style.subtitle">{{ item.subtitle }}</span>
				</span>
				<span v-if="item.meta" :class="$style.meta">{{ item.meta }}</span>
			</li>
		</ol>
		<p v-if="remaining > 0" :class="[$style.more, $style.chrome]" style="--rc-delay: 0.8s">
			{{ t('resultCard.more', { count: String(remaining) }) }}
		</p>
	</div>
</template>

<style lang="scss" module>
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

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}
.items {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin: 0;
	padding: 0;
	list-style: none;
}
.item {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}
.marker {
	flex: none;
	width: 16px;
	height: 16px;
	border-radius: 5px;
	border: 2px solid var(--rc-bar);
	opacity: 0.85;
}
.text {
	display: flex;
	flex: 1;
	min-width: 0;
	flex-direction: column;
}
.title {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	color: var(--rc-ink);
	text-decoration: none;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
a.title:hover {
	text-decoration: underline;
}
.subtitle {
	font-size: var(--font-size--3xs);
	color: var(--rc-ink-muted);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.meta {
	flex: none;
	font-size: var(--font-size--2xs);
	font-variant-numeric: tabular-nums;
	color: var(--rc-ink-muted);
}
.more {
	margin: 0 0 0 26px;
	font-size: var(--font-size--3xs);
	color: var(--rc-ink-muted);
}

.reveal,
.chrome {
	opacity: 1;
}
:global(.rc-animated) .reveal {
	animation: rc-pop 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
	animation-delay: var(--rc-delay, 0s);
}
:global(.rc-animated) .chrome {
	animation: rc-fade 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
	animation-delay: var(--rc-delay, 0s);
}
@media (prefers-reduced-motion: reduce) {
	:global(.rc-animated) .reveal,
	:global(.rc-animated) .chrome {
		animation: rc-fade 0.2s ease both;
		animation-delay: 0s;
	}
}
</style>
