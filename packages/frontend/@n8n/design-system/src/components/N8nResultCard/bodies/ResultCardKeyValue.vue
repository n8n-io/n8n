<script lang="ts" setup>
import { computed } from 'vue';

import type { KeyValueCardData } from '../ResultCard.types';
import { stagger } from '../utils';

const props = defineProps<{ card: KeyValueCardData; light: boolean; animated: boolean }>();

const MAX_PAIRS = 6;
const shown = computed(() => props.card.pairs.slice(0, MAX_PAIRS));
/** The first pair becomes the big stat when its value is short enough to be a number or a badge */
const lead = computed(() =>
	shown.value[0] && shown.value[0].value.length <= 14 ? shown.value[0] : null,
);
const rest = computed(() => (lead.value ? shown.value.slice(1) : shown.value));
</script>

<template>
	<div :class="$style.kv">
		<div v-if="lead" :class="[$style.lead, $style.reveal]" style="--rc-delay: 0.15s">
			<span :class="$style.leadValue">{{ lead.value }}</span>
			<span :class="$style.leadKey">{{ lead.key }}</span>
		</div>
		<dl :class="$style.pairs">
			<template v-for="(pair, index) in rest" :key="index">
				<dt
					:class="[$style.key, $style.reveal]"
					:style="{ '--rc-delay': stagger(index, 0.35, 0.08) }"
				>
					{{ pair.key }}
				</dt>
				<dd
					:class="[$style.value, $style.reveal]"
					:style="{ '--rc-delay': stagger(index, 0.35, 0.08) }"
				>
					{{ pair.value }}
				</dd>
			</template>
		</dl>
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

.kv {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}
.lead {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--2xs);
}
.leadValue {
	font-size: 34px;
	font-weight: var(--font-weight--bold);
	line-height: 1;
	letter-spacing: -0.03em;
	font-variant-numeric: tabular-nums;
	color: var(--rc-ink);
}
.leadKey {
	font-size: var(--font-size--sm);
	color: var(--rc-ink-soft);
}
.pairs {
	display: grid;
	grid-template-columns: minmax(0, 42%) 1fr;
	column-gap: var(--spacing--xs);
	row-gap: 0;
	margin: 0;
}
.key,
.value {
	margin: 0;
	padding: 7px 0;
	border-top: 1px solid var(--rc-hairline);
}
.key {
	color: var(--rc-ink-muted);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.value {
	color: var(--rc-ink);
	font-weight: var(--font-weight--medium);
	overflow-wrap: anywhere;
}

.reveal {
	opacity: 1;
}
:global(.rc-animated) .reveal {
	animation: rc-pop 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
	animation-delay: var(--rc-delay, 0s);
}
@media (prefers-reduced-motion: reduce) {
	:global(.rc-animated) .reveal {
		animation: rc-fade 0.2s ease both;
		animation-delay: 0s;
	}
}
</style>
