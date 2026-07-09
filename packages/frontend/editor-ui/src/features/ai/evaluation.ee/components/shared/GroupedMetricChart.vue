<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { versionColorVar } from './versionPalette';

interface MetricGroup {
	label: string;
	// values: one entry per version, in the SAME order as VersionAvatar
	// indices. `null` = run skipped / no metric on that version → no bar.
	values: Array<number | null>;
}

const props = withDefaults(
	defineProps<{
		groups: MetricGroup[];
		// 0..1 — values outside the range get clamped. Bar height encodes the
		// fraction of this max, so the chart stays comparable across cards.
		max?: number;
	}>(),
	{
		max: 1,
	},
);

const i18n = useI18n();

// Fixed geometry — the mini chart has a single caller (the collection card).
// Promote to props only if a second caller needs to vary them.
const BAR_WIDTH = 18;
const BAR_GAP = 5;
const GROUP_GAP = 72;
const HEIGHT = 72;

const clamp01 = (v: number, max: number) => {
	if (!Number.isFinite(v)) return 0;
	return Math.max(0, Math.min(1, v / max));
};

interface RenderedBar {
	x: number;
	y: number;
	width: number;
	height: number;
	color: string;
	titleText: string;
}

interface RenderedGroup {
	label: string;
	x: number;
	width: number;
	bars: RenderedBar[];
}

const layout = computed<{ width: number; groups: RenderedGroup[] }>(() => {
	const rendered: RenderedGroup[] = [];
	let x = 0;
	const versionsPerGroup = props.groups[0]?.values.length ?? 0;
	const groupWidth = versionsPerGroup * BAR_WIDTH + Math.max(0, versionsPerGroup - 1) * BAR_GAP;

	for (const group of props.groups) {
		const bars: RenderedBar[] = [];
		group.values.forEach((value, vi) => {
			const fraction = value === null ? 0 : clamp01(value, props.max);
			const h = Math.round(fraction * HEIGHT);
			bars.push({
				x: x + vi * (BAR_WIDTH + BAR_GAP),
				y: HEIGHT - h,
				width: BAR_WIDTH,
				height: h,
				color: versionColorVar(vi),
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
		x += groupWidth + GROUP_GAP;
	}

	return {
		width: x === 0 ? 0 : x - GROUP_GAP,
		groups: rendered,
	};
});
</script>

<template>
	<div :class="$style.wrap" data-test-id="grouped-metric-chart">
		<!--
			Labels sit ABOVE the bars per Figma — HTML divs instead of SVG
			text so each label can ellipsis to its own group's width when
			the metric name is too long for the column.
		-->
		<div :class="$style.labelsRow" :style="{ width: `${layout.width}px` }">
			<div
				v-for="group in layout.groups"
				:key="`label-${group.label}`"
				:class="$style.label"
				:style="{
					width: `${group.width + GROUP_GAP}px`,
					marginRight: 0,
				}"
				:title="group.label"
			>
				{{ group.label }}
			</div>
		</div>
		<svg
			:width="layout.width"
			:height="HEIGHT"
			:viewBox="`0 0 ${layout.width} ${HEIGHT}`"
			role="img"
			:aria-label="
				i18n.baseText('evaluation.collections.chart.ariaLabel', { adjustToNumber: groups.length })
			"
		>
			<g v-for="group in layout.groups" :key="group.label">
				<rect
					v-for="bar in group.bars"
					:key="`${group.label}-${bar.x}`"
					:x="bar.x"
					:y="bar.y"
					:width="bar.width"
					:height="bar.height"
					rx="1.5"
					:fill="bar.color"
				>
					<title>{{ bar.titleText }}</title>
				</rect>
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
</style>
