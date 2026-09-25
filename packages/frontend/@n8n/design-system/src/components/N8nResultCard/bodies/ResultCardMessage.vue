<script lang="ts" setup>
import { computed } from 'vue';

import N8nIcon from '../../N8nIcon';
import type { MessageCardData, ResultCardSkin } from '../ResultCard.types';

const props = defineProps<{ card: MessageCardData; skin: ResultCardSkin }>();

const author = computed(() => props.card.author ?? 'n8n');
const initial = computed(() => author.value.trim().charAt(0).toUpperCase() || 'N');
</script>

<template>
	<div :class="[$style.message, $style[`grammar-${skin.grammar}`]]">
		<span v-if="skin.grammar !== 'bubbleRight'" :class="$style.avatar" aria-hidden="true">{{
			initial
		}}</span>
		<div :class="$style.bubble">
			<p :class="$style.meta">
				<span :class="$style.author">{{ author }}</span>
				<span :class="$style.to">{{ card.isReply ? '↩ ' : '' }}{{ card.to }}</span>
			</p>
			<p :class="$style.text">{{ card.text }}</p>
			<span v-if="skin.grammar === 'bubbleRight'" :class="$style.ticks" aria-hidden="true">
				<N8nIcon icon="check-check" size="xsmall" />
			</span>
		</div>
	</div>
</template>

<style lang="scss" module>
.message {
	display: flex;
	gap: var(--spacing--2xs);
	align-items: flex-start;
}

.avatar {
	display: inline-flex;
	flex: none;
	width: 28px;
	height: 28px;
	border-radius: var(--radius--xs);
	align-items: center;
	justify-content: center;
	font-weight: var(--font-weight--bold);
	background: var(--result-card--accent-soft);
	color: var(--result-card--accent);
}

.grammar-none .avatar {
	border-radius: var(--radius--full);
}

.bubble {
	position: relative;
	flex: 1;
	min-width: 0;
}

.meta {
	display: flex;
	gap: var(--spacing--2xs);
	margin: 0;
	align-items: baseline;
}

.author {
	font-weight: var(--font-weight--bold);
}

.to {
	font-size: var(--font-size--3xs);
	color: var(--text-color--subtler);
}

.text {
	margin: var(--spacing--5xs) 0 0;
	white-space: pre-wrap;
	overflow-wrap: anywhere;
	display: -webkit-box;
	-webkit-line-clamp: 4;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.grammar-bubbleRight {
	justify-content: flex-end;
}

.grammar-bubbleRight .bubble {
	flex: none;
	max-width: 85%;
	padding: var(--spacing--2xs) var(--spacing--xs) var(--spacing--2xs) var(--spacing--xs);
	border-radius: var(--radius--md) var(--radius--md) var(--radius--3xs) var(--radius--md);
	background: var(--result-card--accent-soft);
}

.grammar-bubbleRight .meta {
	display: none;
}

.ticks {
	position: absolute;
	right: var(--spacing--4xs);
	bottom: var(--spacing--5xs);
	color: var(--result-card--accent);
	line-height: 1;
}
</style>
