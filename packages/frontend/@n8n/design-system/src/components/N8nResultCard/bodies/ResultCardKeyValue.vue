<script lang="ts" setup>
import { computed } from 'vue';

import RcDigits from '../motion/RcDigits.vue';
import RcTextSoft from '../motion/RcTextSoft.vue';
import type { KeyValueCardData } from '../ResultCard.types';
import { stagger } from '../utils';

/**
 * Key / value: the first short value becomes the big stat, the rest sit in a
 * hairlined two-column grid. Values soft-swap when a variant changes them.
 */
const props = defineProps<{ card: KeyValueCardData; animated: boolean }>();

const MAX_PAIRS = 6;
const shown = computed(() => props.card.pairs.slice(0, MAX_PAIRS));
/** The first pair becomes the big stat when its value is short enough to be a number or a badge */
const lead = computed(() =>
	shown.value[0] && shown.value[0].value.length <= 14 ? shown.value[0] : null,
);
const leadIsNumeric = computed(() => !!lead.value && /^[\d.,%+\-\s]+$/.test(lead.value.value));
const rest = computed(() => (lead.value ? shown.value.slice(1) : shown.value));
</script>

<template>
	<div :class="$style.kv" data-test-id="result-card-key-value">
		<div v-if="lead" :class="[$style.lead, $style.reveal]" style="--rc-delay: 0.05s">
			<span :class="$style.leadValue">
				<RcDigits v-if="leadIsNumeric" :value="lead.value" :animated="animated" />
				<RcTextSoft v-else :text="lead.value" />
			</span>
			<span :class="$style.leadKey">{{ lead.key }}</span>
		</div>
		<dl :class="$style.pairs">
			<template v-for="(pair, index) in rest" :key="pair.key">
				<dt
					:class="[$style.key, $style.reveal]"
					:style="{ '--rc-delay': stagger(index, 0.15, 0.06) }"
				>
					{{ pair.key }}
				</dt>
				<dd
					:class="[$style.value, $style.reveal]"
					:style="{ '--rc-delay': stagger(index, 0.15, 0.06) }"
				>
					<RcTextSoft :text="pair.value" align="end" />
				</dd>
			</template>
		</dl>
	</div>
</template>

<style lang="scss" module>
.kv {
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 4px 24px 0;
}
.lead {
	display: flex;
	align-items: baseline;
	gap: 8px;
}
.leadValue {
	font-size: 34px;
	line-height: 40px;
	font-weight: 500;
	letter-spacing: -0.02em;
	font-variant-numeric: tabular-nums;
	color: var(--rc-fg);
}
.leadKey {
	font-size: 13px;
	line-height: 20px;
	color: var(--rc-muted);
}
.pairs {
	display: grid;
	grid-template-columns: minmax(0, 44%) 1fr;
	column-gap: 0;
	row-gap: 0;
	margin: 0;
}
.key,
.value {
	margin: 0;
	padding: 6px 0;
	font-size: 13px;
	line-height: 20px;
	border-top: 1px solid var(--rc-divider);
}
.key {
	padding-right: 12px;
	color: var(--rc-muted);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.value {
	color: var(--rc-fg);
	text-align: right;
	overflow-wrap: anywhere;
	font-variant-numeric: tabular-nums;
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
.reveal {
	opacity: 1;
}
:global(.rc-animated) .reveal {
	animation: rc-pop var(--rc-enter-dur, 500ms) var(--rc-ease-smooth-out) both;
	animation-delay: var(--rc-delay, 0s);
}
@media (prefers-reduced-motion: reduce) {
	:global(.rc-animated) .reveal {
		animation: rc-fade 0.2s ease both;
		animation-delay: 0s;
	}
}
</style>
