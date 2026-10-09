<script lang="ts" setup>
import { computed } from 'vue';

import { useI18n } from '../../../composables/useI18n';
import N8nIcon from '../../N8nIcon';
import type { IconName } from '../../N8nIcon/icons';
import type { WeatherCardData, WeatherConditionIcon } from '../ResultCard.types';
import { useCountUp } from '../useCountUp';
import { stagger } from '../utils';

const props = defineProps<{ card: WeatherCardData; light: boolean; animated: boolean }>();

const { t } = useI18n();

const GLYPHS: Record<WeatherConditionIcon, IconName> = {
	sun: 'sun',
	'partly-cloudy': 'cloud-sun',
	cloud: 'cloud',
	fog: 'cloud-fog',
	drizzle: 'cloud-drizzle',
	rain: 'cloud-rain',
	snow: 'cloud-snow',
	thunder: 'cloud-lightning',
	wind: 'wind',
};

const glyph = (icon: WeatherConditionIcon): IconName => GLYPHS[icon] ?? 'cloud';

/** Whole degrees for the hero and chips; a weather reading is never worth a decimal to a reader. */
const degrees = (value: number) => `${Math.round(value)}°`;

const display = useCountUp(() => String(Math.round(props.card.temperature)), {
	enabled: () => props.animated,
});

const details = computed(() => {
	const parts: string[] = [];
	if (props.card.feelsLike !== undefined) {
		parts.push(t('resultCard.weather.feelsLike', { temperature: degrees(props.card.feelsLike) }));
	}
	if (props.card.humidity !== undefined) parts.push(`${Math.round(props.card.humidity)}%`);
	if (props.card.wind) {
		const { speed, unit, direction } = props.card.wind;
		parts.push([`${Math.round(speed)} ${unit}`, direction].filter(Boolean).join(' '));
	}
	if (props.card.high !== undefined && props.card.low !== undefined) {
		parts.push(
			t('resultCard.weather.range', {
				high: degrees(props.card.high),
				low: degrees(props.card.low),
			}),
		);
	}
	return parts;
});

const sources = computed(() => (props.card.sources ?? []).slice(0, 5));

/** How far apart the services are; one source has nothing to agree with. */
const agreement = computed(() => {
	const temps = sources.value.map((source) => source.temperature);
	if (temps.length < 2) return '';
	const spread = Math.max(...temps) - Math.min(...temps);
	return t('resultCard.weather.agreement', {
		count: String(temps.length),
		spread: `${spread.toFixed(1).replace(/\.0$/, '')}°`,
	});
});

const forecast = computed(() => (props.card.forecast ?? []).slice(0, 5));
</script>

<template>
	<div :class="$style.weather" data-test-id="result-card-weather">
		<div :class="[$style.heroRow, $style.reveal]" style="--rc-delay: 0.1s">
			<N8nIcon :icon="glyph(card.icon)" :class="$style.glyph" aria-hidden="true" />
			<span :class="$style.temperature" data-test-id="result-card-weather-temperature"
				>{{ display }}<span :class="$style.degree">°{{ card.unit }}</span></span
			>
			<span :class="$style.condition">{{ card.condition }}</span>
		</div>

		<p
			v-if="details.length"
			:class="[$style.details, $style.reveal]"
			style="--rc-delay: 0.25s"
			data-test-id="result-card-weather-details"
		>
			<template v-for="(part, index) in details" :key="index">
				<span v-if="index > 0" :class="$style.separator" aria-hidden="true">·</span>
				<span>{{ part }}</span>
			</template>
		</p>

		<div :class="$style.sources" data-test-id="result-card-weather-sources">
			<span
				v-for="(source, index) in sources"
				:key="index"
				:class="[$style.chip, $style.reveal]"
				:style="{ '--rc-delay': stagger(index, 0.4, 0.08) }"
				:title="source.condition"
			>
				<span :class="$style.chipName">{{ source.name }}</span>
				<span :class="$style.chipTemp">{{ degrees(source.temperature) }}</span>
			</span>
		</div>
		<p v-if="agreement" :class="[$style.agreement, $style.chrome]" style="--rc-delay: 0.75s">
			{{ agreement }}
		</p>

		<div v-if="forecast.length" :class="$style.forecast" data-test-id="result-card-weather-forecast">
			<div
				v-for="(day, index) in forecast"
				:key="index"
				:class="[$style.day, $style.reveal]"
				:style="{ '--rc-delay': stagger(index, 0.8, 0.07) }"
			>
				<span :class="$style.dayLabel">{{ day.label }}</span>
				<N8nIcon :icon="glyph(day.icon)" :class="$style.dayGlyph" aria-hidden="true" />
				<span :class="$style.dayRange"
					>{{ Math.round(day.high) }}<span :class="$style.dayLow">/{{ Math.round(day.low) }}</span></span
				>
			</div>
		</div>
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

.weather {
	display: flex;
	flex-direction: column;
}
.heroRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex-wrap: wrap;
}
.glyph {
	flex: none;
	width: 40px;
	height: 40px;
	color: var(--rc-ink);
}
.temperature {
	font-size: 44px;
	font-weight: var(--font-weight--bold);
	line-height: 1;
	letter-spacing: -0.03em;
	font-variant-numeric: tabular-nums;
	color: var(--rc-ink);
}
.degree {
	margin-left: 1px;
	font-size: 18px;
	font-weight: var(--font-weight--medium);
	vertical-align: top;
	color: var(--rc-ink-soft);
}
.condition {
	margin-left: var(--spacing--4xs);
	font-size: var(--font-size--sm);
	line-height: 1.3;
	color: var(--rc-ink-soft);
}
.details {
	display: flex;
	flex-wrap: wrap;
	gap: 0 var(--spacing--4xs);
	margin: var(--spacing--3xs) 0 0;
	font-size: var(--font-size--2xs);
	font-variant-numeric: tabular-nums;
	color: var(--rc-ink-muted);
}
.separator {
	color: var(--rc-ink-faint);
}
.sources {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--4xs);
	margin-top: var(--spacing--sm);
}
.chip {
	display: inline-flex;
	align-items: baseline;
	gap: var(--spacing--5xs);
	padding: 3px var(--spacing--2xs);
	border-radius: var(--radius--full);
	background: var(--rc-panel-strong);
	font-size: var(--font-size--3xs);
	line-height: 1.3;
	white-space: nowrap;
}
.chipName {
	color: var(--rc-ink-muted);
}
.chipTemp {
	font-weight: var(--font-weight--medium);
	font-variant-numeric: tabular-nums;
	color: var(--rc-ink);
}
.agreement {
	margin: var(--spacing--4xs) 0 0;
	font-size: var(--font-size--3xs);
	color: var(--rc-ink-muted);
}
.forecast {
	display: flex;
	gap: var(--spacing--4xs);
	margin-top: var(--spacing--sm);
	padding-top: var(--spacing--2xs);
	border-top: 1px solid var(--rc-hairline);
}
.day {
	display: flex;
	flex: 1;
	flex-direction: column;
	align-items: center;
	gap: 2px;
	min-width: 0;
}
.dayLabel {
	font-size: var(--font-size--4xs);
	letter-spacing: 0.04em;
	text-transform: uppercase;
	color: var(--rc-ink-muted);
}
.dayGlyph {
	width: 18px;
	height: 18px;
	color: var(--rc-ink-soft);
}
.dayRange {
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--medium);
	font-variant-numeric: tabular-nums;
	color: var(--rc-ink);
}
.dayLow {
	font-weight: var(--font-weight--regular);
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
