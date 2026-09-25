<script lang="ts" setup>
import { computed } from 'vue';

import { useI18n } from '../../../composables/useI18n';
import type { ListCardData, ResultCardSkin } from '../ResultCard.types';
import { isSafeHref } from '../utils';

const props = defineProps<{ card: ListCardData; skin: ResultCardSkin }>();
const { t } = useI18n();

const MAX_ITEMS = 5;
const shownItems = computed(() => props.card.items.slice(0, MAX_ITEMS));
const remaining = computed(() =>
	Math.max(0, (props.card.total ?? props.card.items.length) - shownItems.value.length),
);
</script>

<template>
	<div :class="$style.list">
		<ol :class="$style.items">
			<li v-for="(item, index) in shownItems" :key="index" :class="$style.item">
				<span :class="$style.bullet" aria-hidden="true"></span>
				<div :class="$style.text">
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
				</div>
				<span v-if="item.meta" :class="$style.meta">{{ item.meta }}</span>
			</li>
		</ol>
		<p v-if="remaining > 0" :class="$style.more">
			{{ t('resultCard.more', { count: String(remaining) }) }}
		</p>
	</div>
</template>

<style lang="scss" module>
.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.items {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	margin: 0;
	padding: 0;
	list-style: none;
}

.item {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--2xs);
}

.bullet {
	flex: none;
	width: 6px;
	height: 6px;
	border-radius: var(--radius--full);
	background: var(--result-card--accent);
	transform: translateY(-1px);
}

.text {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
}

.title {
	font-weight: var(--font-weight--medium);
	color: var(--text-color);
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
	color: var(--text-color--subtler);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.meta {
	flex: none;
	font-size: var(--font-size--3xs);
	font-variant-numeric: tabular-nums;
	color: var(--text-color--subtler);
}

.more {
	margin: 0;
	font-size: var(--font-size--3xs);
	color: var(--text-color--subtler);
}
</style>
