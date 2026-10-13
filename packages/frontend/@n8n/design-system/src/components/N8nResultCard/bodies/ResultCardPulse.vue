<script lang="ts" setup>
import { computed } from 'vue';

import { useI18n } from '../../../composables/useI18n';
import RcDigits from '../motion/RcDigits.vue';
import RcTextSoft from '../motion/RcTextSoft.vue';
import type { PulseCardData } from '../ResultCard.types';

/**
 * Pulse (transitions.dev "Heart Rate Monitor"): a big reading that pops digit
 * by digit when it changes, a live trace sweeping across a grid, and a stats
 * row. The range menu is the shell's `menu` switcher; variants can change the
 * value, the sweep period and the stats.
 */
const props = defineProps<{ card: PulseCardData; animated: boolean }>();

const { t } = useI18n();

const W = 260;
const H = 80;
const PAD = 8;

/** Heartbeat-shaped default trace, three beats across the box. */
const HEARTBEAT =
	'M0 40 H40 L46 40 L52 12 L58 62 L64 40 L70 44 L76 40 H120 L126 40 L132 12 L138 62 L144 40 L150 44 L156 40 H200 L206 40 L212 12 L218 62 L224 40 L230 44 L236 40 H260';

const path = computed(() => {
	const trace = props.card.trace;
	if (!trace || trace.length < 2) return HEARTBEAT;
	const min = Math.min(...trace);
	const max = Math.max(...trace);
	const span = max - min || 1;
	return trace
		.map((value, index) => {
			const x = ((index / (trace.length - 1)) * W).toFixed(1);
			const y = (H - PAD - ((value - min) / span) * (H - PAD * 2)).toFixed(1);
			return `${index === 0 ? 'M' : 'L'}${x} ${y}`;
		})
		.join(' ');
});

const verticals = Array.from({ length: 9 }, (_, index) => (index + 1) * 26);
const horizontals = Array.from({ length: 3 }, (_, index) => (index + 1) * 20);

const value = computed(() => String(props.card.value));
const sweep = computed(() => `${props.card.period ?? 2.4}s`);
const stats = computed(() => (props.card.stats ?? []).slice(0, 3));
</script>

<template>
	<div :class="$style.pulse" data-test-id="result-card-pulse">
		<div v-if="card.label || card.live" :class="$style.caption">
			<span v-if="card.live" :class="$style.live" data-test-id="result-card-pulse-live">
				<span :class="$style.liveDot" aria-hidden="true" />
				{{ t('resultCard.pulse.live') }}
			</span>
			<span v-if="card.label" :class="$style.label">{{ card.label }}</span>
		</div>

		<div :class="$style.number">
			<span :class="$style.digits" data-test-id="result-card-pulse-value">
				<RcDigits :value="value" :animated="animated" />
			</span>
			<span :class="$style.unit">{{ card.unit }}</span>
		</div>

		<div :class="$style.chart" :style="{ '--rc-ecg-dur': sweep }" aria-hidden="true">
			<svg :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" width="100%" :height="H">
				<g :class="$style.grid">
					<line v-for="x in verticals" :key="`v${x}`" :x1="x" :x2="x" y1="0" :y2="H" />
					<line v-for="y in horizontals" :key="`h${y}`" x1="0" :x2="W" :y1="y" :y2="y" />
				</g>
				<path :class="$style.trail" :d="path" pathLength="100" />
			</svg>
		</div>

		<div v-if="card.section || stats.length" :class="$style.section">
			<span v-if="card.section" :class="$style.heading">{{ card.section }}</span>
			<div v-if="stats.length" :class="$style.stats" :style="{ '--cols': stats.length }">
				<div v-for="stat in stats" :key="stat.label">
					<span :class="$style.cap">{{ stat.label }}</span>
					<span :class="$style.val">
						<RcTextSoft :text="stat.value" />
						<i v-if="stat.unit">{{ stat.unit }}</i>
					</span>
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.pulse {
	padding: 0 16px;
	font-size: 13px;
	line-height: 20px;
	color: var(--rc-fg);
}

.caption {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	color: var(--rc-muted);
}
.label {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.live {
	display: inline-flex;
	align-items: center;
	gap: 5px;
	font-size: 11px;
	line-height: 16px;
	font-weight: 500;
	color: var(--rc-red);
	text-transform: uppercase;
	letter-spacing: 0.04em;
}
.liveDot {
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background: currentColor;
	animation: rc-live-blink 2s ease-in-out infinite;
}
@keyframes rc-live-blink {
	0%,
	100% {
		opacity: 1;
	}
	50% {
		opacity: 0.35;
	}
}

.number {
	display: flex;
	align-items: baseline;
	justify-content: center;
	gap: 8px;
	margin: 8px 0;
}
.digits {
	font-size: 60px;
	line-height: 70px;
	font-weight: 500;
	font-variant-numeric: tabular-nums;
	letter-spacing: -0.02em;
}
.unit {
	color: var(--rc-muted);
	font-size: 16px;
	line-height: 22px;
}

.chart {
	border-radius: 12px;
	background: light-dark(rgba(0, 0, 0, 0.02), rgba(255, 255, 255, 0.03));
	padding: 8px 0;
	overflow: hidden;
	svg {
		display: block;
	}
}
.grid line {
	stroke: var(--rc-border);
	stroke-width: 1;
	vector-effect: non-scaling-stroke;
}
.trail {
	fill: none;
	stroke: var(--rc-red);
	stroke-width: 2;
	stroke-linecap: round;
	stroke-linejoin: round;
	vector-effect: non-scaling-stroke;
	stroke-dasharray: 30 100;
	stroke-dashoffset: 30;
	animation: rc-ecg var(--rc-ecg-dur, 2.4s) var(--rc-ease-linear, linear) infinite;
}
@keyframes rc-ecg {
	to {
		stroke-dashoffset: -100;
	}
}

.section {
	margin-top: 16px;
	padding: 0 8px;
}
.heading {
	display: block;
	font-size: 16px;
	line-height: 22px;
	font-weight: 500;
	margin-bottom: 8px;
}
.stats {
	display: grid;
	grid-template-columns: repeat(var(--cols, 3), 1fr);
	gap: 8px;
	> div {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
}
.cap {
	display: block;
	font-size: 12px;
	line-height: 16px;
	color: var(--rc-muted);
}
.val {
	font-variant-numeric: tabular-nums;
	white-space: nowrap;
	i {
		font-style: normal;
		font-size: 12px;
		color: var(--rc-muted);
		margin-left: 3px;
	}
}

@media (prefers-reduced-motion: reduce) {
	.trail {
		animation: none;
		stroke-dasharray: none;
	}
	.liveDot {
		animation: none;
	}
}
</style>
