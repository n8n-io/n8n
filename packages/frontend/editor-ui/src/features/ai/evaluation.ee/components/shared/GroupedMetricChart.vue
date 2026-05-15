<script setup lang="ts">
import { computed } from 'vue';

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
		barWidth?: number;
		barGap?: number;
		groupGap?: number;
		height?: number;
	}>(),
	{
		max: 1,
		barWidth: 16,
		barGap: 4,
		groupGap: 48,
		height: 72,
	},
);

const PALETTE = [
	'--color--neutral-800',
	'--color--green-600',
	'--color--orange-500',
	'--color--blue-600',
	'--color--purple-600',
	'--color--red-600',
] as const;

const versionColor = (i: number) => `var(${PALETTE[i % PALETTE.length]})`;

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
	const groupWidth =
		versionsPerGroup * props.barWidth + Math.max(0, versionsPerGroup - 1) * props.barGap;

	for (const group of props.groups) {
		const bars: RenderedBar[] = [];
		group.values.forEach((value, vi) => {
			const fraction = value === null ? 0 : clamp01(value, props.max);
			const h = Math.round(fraction * props.height);
			bars.push({
				x: x + vi * (props.barWidth + props.barGap),
				y: props.height - h,
				width: props.barWidth,
				height: h,
				color: versionColor(vi),
				titleText:
					value === null
						? `${group.label} · no data`
						: `${group.label} · ${Math.round(value * 100)}%`,
			});
		});
		rendered.push({ label: group.label, x, width: groupWidth, bars });
		x += groupWidth + props.groupGap;
	}

	return {
		width: x === 0 ? 0 : x - props.groupGap,
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
				:style="{ width: `${group.width}px`, marginRight: `${groupGap}px` }"
				:title="group.label"
			>
				{{ group.label }}
			</div>
		</div>
		<svg
			:width="layout.width"
			:height="height"
			:viewBox="`0 0 ${layout.width} ${height}`"
			role="img"
			:aria-label="`Grouped metric chart for ${groups.length} metrics`"
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
	gap: 4px;
}

.labelsRow {
	display: flex;
	flex-wrap: nowrap;
}

.label {
	font-size: 10px;
	font-family: var(--font-family);
	color: var(--text-color--subtler);
	text-align: center;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;

	&:last-child {
		margin-right: 0 !important;
	}
}
</style>
