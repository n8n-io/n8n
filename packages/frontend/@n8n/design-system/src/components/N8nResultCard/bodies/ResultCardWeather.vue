<script lang="ts" setup>
import { computed } from 'vue';

import { useI18n } from '../../../composables/useI18n';
import RcDigits from '../motion/RcDigits.vue';
import RcGlyph from '../motion/RcGlyph.vue';
import RcIconSwap from '../motion/RcIconSwap.vue';
import RcIconSwapItem from '../motion/RcIconSwapItem.vue';
import RcTextMorph from '../motion/RcTextMorph.vue';
import RcTextSwap from '../motion/RcTextSwap.vue';
import type { WeatherCardData, WeatherConditionIcon } from '../ResultCard.types';

/**
 * Weather (transitions.dev "Weather Day Switcher"): a living sky behind the
 * place, the day, a big temperature and the condition. Switching a variant
 * cross-fades the sky, swaps the large icon, morphs the day name, pops the
 * digits and travels the condition label. The day tabs are the card's
 * switcher, rendered by the shell as a strip over the sky.
 */
const props = defineProps<{ card: WeatherCardData; animated: boolean }>();

const { t } = useI18n();

type Sky = 'clear' | 'cloudy' | 'rain' | 'storm' | 'snow';
type Big = 'sun' | 'cloud' | 'rain' | 'bolt' | 'snow';

const SKY: Record<WeatherConditionIcon, Sky> = {
	sun: 'clear',
	'partly-cloudy': 'clear',
	cloud: 'cloudy',
	fog: 'cloudy',
	wind: 'cloudy',
	drizzle: 'rain',
	rain: 'rain',
	thunder: 'storm',
	snow: 'snow',
};
const BIG: Record<WeatherConditionIcon, Big> = {
	sun: 'sun',
	'partly-cloudy': 'sun',
	cloud: 'cloud',
	fog: 'cloud',
	wind: 'cloud',
	drizzle: 'rain',
	rain: 'rain',
	thunder: 'bolt',
	snow: 'snow',
};

const sky = computed<Sky>(() => SKY[props.card.icon] ?? 'clear');
const big = computed<Big>(() => BIG[props.card.icon] ?? 'sun');

const temperature = computed(() => String(Math.round(props.card.temperature)));
const high = computed(() =>
	props.card.high === undefined ? undefined : String(Math.round(props.card.high)),
);
const low = computed(() =>
	props.card.low === undefined ? undefined : String(Math.round(props.card.low)),
);

/** The day line: the variant's eyebrow ("Tuesday"), else the card's eyebrow */
const day = computed(() => props.card.eyebrow ?? '');

const extras = computed(() => {
	const parts: string[] = [];
	if (props.card.feelsLike !== undefined) {
		parts.push(
			t('resultCard.weather.feelsLike', { temperature: `${Math.round(props.card.feelsLike)}°` }),
		);
	}
	if (props.card.humidity !== undefined) parts.push(`${Math.round(props.card.humidity)}%`);
	if (props.card.wind) {
		const { speed, unit, direction } = props.card.wind;
		parts.push([`${Math.round(speed)} ${unit}`, direction].filter(Boolean).join(' '));
	}
	return parts.join(' · ');
});

/** Deterministic rain streaks, as the reference lays them out. */
function streaks(count: number) {
	return Array.from({ length: count }, (_, index) => ({
		x: `${Math.min(((index * 37) % 100) + (index % 3) * 2, 112)}%`,
		d: ((index * 0.618) % 1).toFixed(3),
		len: `${12 + ((index * 7) % 10)}px`,
	}));
}
const rain = streaks(14);
const storm = streaks(20);
const flakes = Array.from({ length: 18 }, (_, index) => ({
	x: `${(index * 53) % 100}%`,
	d: ((index * 0.382) % 1).toFixed(3),
	s: `${3 + (index % 3)}px`,
}));
</script>

<template>
	<div :class="$style.weather" data-test-id="result-card-weather">
		<div :class="$style.bg" :data-wx="sky" aria-hidden="true">
			<div :class="[$style.sky, $style.clear]" data-key="clear">
				<span :class="[$style.blob, $style.cool]" />
				<span :class="[$style.blob, $style.glow]" />
			</div>
			<div :class="[$style.sky, $style.cloudy]" data-key="cloudy">
				<span :class="[$style.blob, $style.cloud1]" />
				<span :class="[$style.blob, $style.cloud2]" />
			</div>
			<div :class="[$style.sky, $style.rainSky]" data-key="rain">
				<span :class="[$style.blob, $style.mist]" />
				<span :class="$style.rain">
					<span
						v-for="(drop, index) in rain"
						:key="index"
						:style="{ '--x': drop.x, '--d': drop.d, '--len': drop.len }"
					/>
				</span>
			</div>
			<div :class="[$style.sky, $style.stormSky]" data-key="storm">
				<span :class="[$style.blob, $style.stormBlob]" />
				<span :class="$style.rain">
					<span
						v-for="(drop, index) in storm"
						:key="index"
						:style="{ '--x': drop.x, '--d': drop.d, '--len': drop.len }"
					/>
				</span>
				<span :class="$style.flash" />
			</div>
			<div :class="[$style.sky, $style.snowSky]" data-key="snow">
				<span :class="[$style.blob, $style.mist]" />
				<span :class="$style.snow">
					<span
						v-for="(flake, index) in flakes"
						:key="index"
						:style="{ '--x': flake.x, '--d': flake.d, '--s': flake.s }"
					/>
				</span>
			</div>
		</div>

		<div :class="$style.content">
			<div :class="$style.place">{{ card.location }}</div>
			<div v-if="day" :class="$style.day" data-test-id="result-card-weather-day">
				<RcTextMorph :text="day" />
			</div>
			<div :class="$style.hero">
				<div :class="$style.temp" data-test-id="result-card-weather-temperature">
					<RcDigits :value="temperature" :animated="animated" /><span :class="$style.deg">°</span>
				</div>
				<div :class="$style.big">
					<RcIconSwap :state="big">
						<RcIconSwapItem name="sun">
							<span :class="[$style.idle, $style.spin]">
								<RcGlyph name="sun" :size="48" :stroke-width="2.1" />
							</span>
						</RcIconSwapItem>
						<RcIconSwapItem name="cloud">
							<span :class="[$style.idle, $style.float]">
								<RcGlyph name="cloud" :size="48" :stroke-width="2.1" />
							</span>
						</RcIconSwapItem>
						<RcIconSwapItem name="rain">
							<span :class="[$style.idle, $style.float]">
								<RcGlyph name="cloud" :size="48" :stroke-width="2.1" />
							</span>
							<span :class="$style.drops"><span /><span /><span /></span>
						</RcIconSwapItem>
						<RcIconSwapItem name="bolt">
							<span :class="[$style.idle, $style.flicker]">
								<RcGlyph name="bolt" :size="48" :stroke-width="2.1" />
							</span>
						</RcIconSwapItem>
						<RcIconSwapItem name="snow">
							<span :class="[$style.idle, $style.float]">
								<RcGlyph name="cloud" :size="48" :stroke-width="2.1" />
							</span>
							<span :class="[$style.drops, $style.flakeDrops]"><span /><span /><span /></span>
						</RcIconSwapItem>
					</RcIconSwap>
				</div>
			</div>
			<div :class="$style.cond" data-test-id="result-card-weather-condition">
				<RcTextSwap :text="card.condition" />
			</div>
			<div v-if="high !== undefined && low !== undefined" :class="$style.hl">
				H:<RcDigits :value="high" :animated="animated" />° L:<RcDigits
					:value="low"
					:animated="animated"
				/>°
			</div>
			<div v-if="extras" :class="$style.extras" data-test-id="result-card-weather-details">
				{{ extras }}
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.weather {
	position: relative;
	color: #fff;
	--wx-muted: rgba(255, 255, 255, 0.8);
	--wx-sun: #ffd75e;
}

/* ---- sky backdrop: spans the whole card (the body is not positioned) ---- */
.bg {
	position: absolute;
	inset: 0;
	z-index: -1;
}
.sky {
	position: absolute;
	inset: 0;
	overflow: hidden;
	opacity: 0;
	transition: opacity var(--rc-wx-sky-fade, 700ms) var(--rc-wx-sky-ease, ease-in-out);
}
.bg[data-wx='clear'] .sky[data-key='clear'],
.bg[data-wx='cloudy'] .sky[data-key='cloudy'],
.bg[data-wx='rain'] .sky[data-key='rain'],
.bg[data-wx='storm'] .sky[data-key='storm'],
.bg[data-wx='snow'] .sky[data-key='snow'] {
	opacity: 1;
}
.clear {
	background: linear-gradient(180deg, #1f6fd1 0%, #2f7fdb 55%, #3b8ae0 100%);
}
.cloudy {
	background: linear-gradient(180deg, #4e6a85 0%, #7a91a8 100%);
}
.rainSky {
	background: linear-gradient(180deg, #3f5266 0%, #5f7388 100%);
}
.stormSky {
	background: linear-gradient(180deg, #323b47 0%, #56616e 100%);
}
.snowSky {
	background: linear-gradient(180deg, #5b7391 0%, #8ea2b8 100%);
}

.blob {
	position: absolute;
	border-radius: 50%;
	animation: wx-drift var(--rc-wx-drift-dur, 16s) ease-in-out infinite alternate;
}
.glow {
	width: 240px;
	height: 240px;
	right: -110px;
	bottom: -110px;
	background: radial-gradient(circle, rgba(255, 200, 120, 0.34), rgba(255, 200, 120, 0) 65%);
}
.cool {
	width: 280px;
	height: 280px;
	left: -130px;
	top: 70px;
	background: radial-gradient(circle, rgba(110, 190, 255, 0.32), rgba(110, 190, 255, 0) 68%);
	animation-duration: calc(var(--rc-wx-drift-dur, 16s) * 1.3);
	animation-direction: alternate-reverse;
}
.cloud1 {
	width: 300px;
	height: 170px;
	left: -90px;
	top: 110px;
	background: radial-gradient(ellipse, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0) 68%);
}
.cloud2 {
	width: 240px;
	height: 150px;
	right: -90px;
	bottom: 30px;
	background: radial-gradient(ellipse, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0) 68%);
	animation-duration: calc(var(--rc-wx-drift-dur, 16s) * 1.25);
	animation-direction: alternate-reverse;
}
.mist {
	width: 320px;
	height: 200px;
	left: -60px;
	bottom: -40px;
	background: radial-gradient(ellipse, rgba(170, 200, 230, 0.22), rgba(170, 200, 230, 0) 68%);
}
.stormBlob {
	width: 300px;
	height: 200px;
	right: -100px;
	top: 40px;
	background: radial-gradient(ellipse, rgba(140, 160, 190, 0.2), rgba(140, 160, 190, 0) 68%);
}
@keyframes wx-drift {
	from {
		transform: translate(0, 0) scale(1);
	}
	to {
		transform: translate(
				var(--rc-wx-drift-distance, 18px),
				calc(var(--rc-wx-drift-distance, 18px) * -0.6)
			)
			scale(1.08);
	}
}

.rain {
	position: absolute;
	inset: 0;
}
.rain > span {
	position: absolute;
	top: -24px;
	left: var(--x);
	width: 1.5px;
	height: var(--len, 16px);
	border-radius: 1px;
	background: linear-gradient(rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.42));
	animation: wx-fall var(--rc-wx-rain-dur, 800ms) linear infinite;
	animation-delay: calc(var(--rc-wx-rain-dur, 800ms) * var(--d) * -1);
}
@keyframes wx-fall {
	from {
		transform: translate(0, 0) rotate(8deg);
	}
	to {
		transform: translate(-50px, 380px) rotate(8deg);
	}
}
.snow {
	position: absolute;
	inset: 0;
}
.snow > span {
	position: absolute;
	top: -8px;
	left: var(--x);
	width: var(--s, 4px);
	height: var(--s, 4px);
	border-radius: 50%;
	background: rgba(255, 255, 255, 0.7);
	animation: wx-snow calc(var(--rc-wx-rain-dur, 800ms) * 6) linear infinite;
	animation-delay: calc(var(--rc-wx-rain-dur, 800ms) * 6 * var(--d) * -1);
}
@keyframes wx-snow {
	from {
		transform: translate(0, 0);
	}
	50% {
		transform: translate(10px, 190px);
	}
	to {
		transform: translate(-6px, 380px);
	}
}
.flash {
	position: absolute;
	inset: 0;
	opacity: 0;
	background: radial-gradient(
		ellipse at 70% 0%,
		rgba(255, 255, 255, 0.5),
		rgba(255, 255, 255, 0) 70%
	);
	animation: wx-flash var(--rc-wx-flash-dur, 7s) ease-out infinite;
}
@keyframes wx-flash {
	0%,
	86%,
	100% {
		opacity: 0;
	}
	88% {
		opacity: 0.4;
	}
	89% {
		opacity: 0.08;
	}
	91% {
		opacity: 0.3;
	}
}

/* ---- content ---- */
.content {
	padding: 8px 24px 0;
}
.place {
	font-size: 16px;
	line-height: 22px;
	font-weight: 500;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.day {
	font-size: 12px;
	line-height: 16px;
	color: var(--wx-muted);
}
.hero {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	margin-top: 8px;
}
.temp {
	flex: 1;
	min-width: 0;
	display: flex;
	align-items: baseline;
	font-size: 60px;
	line-height: 70px;
	font-weight: 500;
	font-variant-numeric: tabular-nums;
}
.deg {
	margin-left: 1px;
}
.big {
	flex: none;
	width: 64px;
	height: 64px;
	display: grid;
	place-items: center;
}
.big :global(span[data-key='sun']),
.big :global(span[data-key='bolt']) {
	color: var(--wx-sun);
}
.big :global(span[data-key='cloud']),
.big :global(span[data-key='rain']),
.big :global(span[data-key='snow']) {
	color: #fff;
}
.idle {
	display: grid;
	place-items: center;
}
.spin {
	animation: wx-spin var(--rc-wx-spin-dur, 30s) linear infinite;
}
.float {
	animation: wx-float var(--rc-wx-float-dur, 4s) ease-in-out infinite alternate;
}
.flicker {
	animation: wx-flicker calc(var(--rc-wx-float-dur, 4s) * 1.5) ease-in-out infinite;
}
@keyframes wx-spin {
	to {
		transform: rotate(360deg);
	}
}
@keyframes wx-float {
	from {
		transform: translateY(calc(var(--rc-wx-float-distance, 3px) * -1));
	}
	to {
		transform: translateY(var(--rc-wx-float-distance, 3px));
	}
}
@keyframes wx-flicker {
	0%,
	70%,
	100% {
		opacity: 1;
		transform: scale(1);
	}
	74% {
		opacity: 0.55;
		transform: scale(0.97);
	}
	78% {
		opacity: 1;
		transform: scale(1.02);
	}
}
.drops {
	position: absolute;
	left: 50%;
	top: 46px;
	width: 24px;
	margin-left: -12px;
	display: flex;
	justify-content: space-between;
}
.drops > span {
	width: 2.5px;
	height: 7px;
	border-radius: 2px;
	background: #fff;
	opacity: 0;
	animation: wx-drop var(--rc-wx-drop-dur, 1100ms) ease-in infinite;
}
.flakeDrops > span {
	width: 4px;
	height: 4px;
	border-radius: 50%;
}
.drops > span:nth-child(2) {
	animation-delay: calc(var(--rc-wx-drop-dur, 1100ms) * 0.35);
}
.drops > span:nth-child(3) {
	animation-delay: calc(var(--rc-wx-drop-dur, 1100ms) * 0.7);
}
@keyframes wx-drop {
	0% {
		transform: translateY(-2px);
		opacity: 0;
	}
	30% {
		opacity: 1;
	}
	100% {
		transform: translateY(10px);
		opacity: 0;
	}
}

.cond {
	font-size: 13px;
	line-height: 20px;
	margin-top: 4px;
}
.hl,
.extras {
	display: flex;
	align-items: baseline;
	font-size: 12px;
	line-height: 16px;
	color: var(--wx-muted);
	font-variant-numeric: tabular-nums;
	white-space: nowrap;
}
.extras {
	display: block;
	margin-top: 2px;
	overflow: hidden;
	text-overflow: ellipsis;
}

@media (prefers-reduced-motion: reduce) {
	.blob,
	.rain > span,
	.snow > span,
	.flash,
	.idle,
	.drops > span {
		animation: none !important;
	}
	.rain,
	.snow,
	.flash {
		display: none;
	}
	.drops > span {
		opacity: 1;
	}
}
</style>
