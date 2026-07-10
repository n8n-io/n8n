<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { versionColorVar } from './versionPalette';

interface MetricGroup {
	label: string;
	// values: one entry per version, in the SAME order as VersionAvatar
	// indices. `null` = run skipped / no metric on that version → no bar.
	values: Array<number | null>;
	// Optional per-version letter (A, B, C…) rendered under each bar in the
	// `detailed` variant so the hero chart is readable without the legend.
	letters?: string[];
}

const props = withDefaults(
	defineProps<{
		groups: MetricGroup[];
		// 0..1 — values outside the range get clamped. Bar height encodes the
		// fraction of this max, so the chart stays comparable across cards.
		max?: number;
		// `mini` (default): compact card preview. `detailed`: larger geometry
		// with score labels above bars + version letters below (compare hero).
		variant?: 'mini' | 'detailed';
		// When set, any bar whose value is below this fraction paints in the
		// danger color regardless of version — a critical-regression signal.
		// `null` (default) disables the rule so card previews stay version-hued.
		criticalThreshold?: number | null;
	}>(),
	{
		max: 1,
		variant: 'mini',
		criticalThreshold: null,
	},
);

const i18n = useI18n();

// Geometry per variant. `mini` keeps the original card dimensions; `detailed`
// reserves vertical room above the bars for score labels and below for the
// version letters.
const GEOMETRY = {
	mini: { barWidth: 18, barGap: 5, groupGap: 72, barsHeight: 72, topPad: 0, bottomPad: 0 },
	detailed: { barWidth: 28, barGap: 12, groupGap: 40, barsHeight: 120, topPad: 20, bottomPad: 22 },
} as const;

const geo = computed(() => GEOMETRY[props.variant]);

const CRITICAL_COLOR = 'var(--color--red-700)';

const clamp01 = (v: number, max: number) => {
	if (!Number.isFinite(v)) return 0;
	return Math.max(0, Math.min(1, v / max));
};

const isCritical = (value: number | null) =>
	props.criticalThreshold !== null && value !== null && value / props.max < props.criticalThreshold;

interface RenderedBar {
	x: number;
	y: number;
	width: number;
	height: number;
	color: string;
	labelX: number;
	valueLabel: string | null;
	letter: string | null;
	titleText: string;
}

interface RenderedGroup {
	label: string;
	x: number;
	width: number;
	bars: RenderedBar[];
}

const layout = computed<{ width: number; groups: RenderedGroup[] }>(() => {
	const { barWidth, barGap, groupGap, barsHeight, topPad } = geo.value;
	const detailed = props.variant === 'detailed';
	const rendered: RenderedGroup[] = [];
	let x = 0;
	const versionsPerGroup = props.groups[0]?.values.length ?? 0;
	const groupWidth = versionsPerGroup * barWidth + Math.max(0, versionsPerGroup - 1) * barGap;

	for (const group of props.groups) {
		const bars: RenderedBar[] = [];
		group.values.forEach((value, vi) => {
			const fraction = value === null ? 0 : clamp01(value, props.max);
			const h = Math.round(fraction * barsHeight);
			const barX = x + vi * (barWidth + barGap);
			const critical = isCritical(value);
			bars.push({
				x: barX,
				y: topPad + (barsHeight - h),
				width: barWidth,
				height: h,
				color: critical ? CRITICAL_COLOR : versionColorVar(vi),
				labelX: barX + barWidth / 2,
				valueLabel: detailed && value !== null ? `${Math.round((value / props.max) * 100)}%` : null,
				letter: detailed ? (group.letters?.[vi] ?? null) : null,
				titleText:
					value === null
						? i18n.baseText('evaluation.collections.chart.barNoData', {
								interpolate: { metric: group.label },
							})
						: i18n.baseText('evaluation.collections.chart.barValue', {
								interpolate: { metric: group.label, value: String(Math.round(value * 100)) },
							}),
			});
		});
		rendered.push({ label: group.label, x, width: groupWidth, bars });
		x += groupWidth + groupGap;
	}

	return {
		width: x === 0 ? 0 : x - groupGap,
		groups: rendered,
	};
});

const svgHeight = computed(() => geo.value.topPad + geo.value.barsHeight + geo.value.bottomPad);
const letterY = computed(() => geo.value.topPad + geo.value.barsHeight + geo.value.bottomPad - 6);
</script>

<template>
	<div :class="$style.wrap" data-test-id="grouped-metric-chart">
		<!--
			Labels sit ABOVE the bars per Figma — HTML divs instead of SVG
			text so each label can ellipsis to its own group's width when
			the metric name is too long for the column. The detailed variant
			hides them: the compare hero renders the metric name as a panel
			heading instead.
		-->
		<div
			v-if="variant === 'mini'"
			:class="$style.labelsRow"
			:style="{ width: `${layout.width}px` }"
		>
			<div
				v-for="group in layout.groups"
				:key="`label-${group.label}`"
				:class="$style.label"
				:style="{
					width: `${group.width + geo.groupGap}px`,
					marginRight: 0,
				}"
				:title="group.label"
			>
				{{ group.label }}
			</div>
		</div>
		<svg
			:width="layout.width"
			:height="svgHeight"
			:viewBox="`0 0 ${layout.width} ${svgHeight}`"
			role="img"
			:aria-label="
				i18n.baseText('evaluation.collections.chart.ariaLabel', { adjustToNumber: groups.length })
			"
		>
			<g v-for="group in layout.groups" :key="group.label">
				<template v-for="bar in group.bars" :key="`${group.label}-${bar.x}`">
					<text
						v-if="bar.valueLabel !== null"
						:x="bar.labelX"
						:y="geo.topPad - 6"
						:class="$style.valueLabel"
						:fill="bar.color"
						text-anchor="middle"
					>
						{{ bar.valueLabel }}
					</text>
					<rect
						:x="bar.x"
						:y="bar.y"
						:width="bar.width"
						:height="bar.height"
						rx="1.5"
						:fill="bar.color"
					>
						<title>{{ bar.titleText }}</title>
					</rect>
					<text
						v-if="bar.letter !== null"
						:x="bar.labelX"
						:y="letterY"
						:class="$style.letterLabel"
						text-anchor="middle"
					>
						{{ bar.letter }}
					</text>
				</template>
			</g>
		</svg>
	</div>
</template>

<style module lang="scss">
.wrap {
	display: inline-flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.labelsRow {
	display: flex;
	flex-wrap: nowrap;
}

.label {
	font-size: var(--font-size--3xs);
	font-family: var(--font-family);
	color: var(--text-color--subtle);
	text-align: left;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-weight: var(--font-weight--medium);

	&:last-child {
		margin-right: 0 !important;
	}
}

.valueLabel {
	font-size: var(--font-size--2xs);
	font-family: var(--font-family);
	font-weight: var(--font-weight--bold);
}

.letterLabel {
	font-size: var(--font-size--2xs);
	font-family: var(--font-family);
	font-weight: var(--font-weight--medium);
	fill: var(--text-color--subtle);
}
</style>
