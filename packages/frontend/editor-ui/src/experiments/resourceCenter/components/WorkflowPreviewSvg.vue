<script setup lang="ts">
interface Props {
	variant?: 'default' | 'minimal';
	opacity?: number;
}

withDefaults(defineProps<Props>(), {
	variant: 'default',
	opacity: 1,
});
</script>

<template>
	<svg
		viewBox="0 0 320 180"
		preserveAspectRatio="xMidYMid meet"
		:class="$style.svg"
		role="img"
		aria-label="Workflow preview"
		:style="{ opacity }"
	>
		<!-- Connection paths - n8n style branching workflow -->
		<g :class="$style.connections">
			<!-- Trigger to upper branch -->
			<path d="M 60,90 C 80,90 80,54 100,54" />
			<!-- Trigger to lower branch -->
			<path d="M 60,90 C 80,90 80,126 100,126" />
			<!-- Upper node 1 to upper node 2 -->
			<path d="M 136,54 C 152,54 160,54 176,54" />
			<!-- Upper node 2 to final -->
			<path d="M 212,54 C 232,54 232,90 252,90" />
			<!-- Lower node to final -->
			<path d="M 136,126 C 180,126 212,90 252,90" />
		</g>

		<!-- Connection dots at branch/merge points -->
		<g :class="$style.connectionDots">
			<circle cx="60" cy="90" r="3" />
			<circle cx="252" cy="90" r="3" />
		</g>

		<!-- Nodes -->
		<g :class="$style.nodes">
			<!-- Trigger node (pill-shaped) -->
			<rect x="24" y="72" width="36" height="36" rx="18" ry="18" :class="$style.triggerNode" />

			<!-- Upper branch node 1 -->
			<rect x="100" y="36" width="36" height="36" rx="8" ry="8" />

			<!-- Upper branch node 2 -->
			<rect x="176" y="36" width="36" height="36" rx="8" ry="8" />

			<!-- Lower branch node -->
			<rect x="100" y="108" width="36" height="36" rx="8" ry="8" />

			<!-- Final merge node -->
			<rect x="252" y="72" width="36" height="36" rx="8" ry="8" />
		</g>

		<!-- Subtle inner icons/shapes to suggest node content -->
		<g :class="$style.nodeIcons">
			<!-- Trigger icon (lightning bolt style) -->
			<path d="M 40,85 L 44,90 L 40,90 L 44,95" :class="$style.triggerIcon" />

			<!-- Upper node 1 - small square -->
			<rect x="113" y="49" width="10" height="10" rx="2" />

			<!-- Upper node 2 - small square -->
			<rect x="189" y="49" width="10" height="10" rx="2" />

			<!-- Lower node - small square -->
			<rect x="113" y="121" width="10" height="10" rx="2" />

			<!-- Final node - small square -->
			<rect x="265" y="85" width="10" height="10" rx="2" />
		</g>
	</svg>
</template>

<style lang="scss" module>
.svg {
	width: 100%;
	height: 100%;
}

.nodes rect {
	fill: var(--color--background);
	stroke: var(--color--foreground);
	stroke-opacity: 0.2;
	stroke-width: 1.5;
}

.triggerNode {
	fill: var(--color--background);
}

.connections path {
	fill: none;
	stroke: var(--color--foreground--shade-1);
	stroke-width: 2;
	stroke-opacity: 0.3;
}

.connectionDots circle {
	fill: var(--color--foreground--shade-1);
	fill-opacity: 0.3;
}

.nodeIcons rect {
	fill: var(--color--foreground);
	fill-opacity: 0.15;
}

.nodeIcons path {
	fill: none;
	stroke: var(--color--foreground);
	stroke-opacity: 0.2;
	stroke-width: 1.5;
	stroke-linecap: round;
	stroke-linejoin: round;
}

.triggerIcon {
	stroke: var(--color--foreground);
	stroke-opacity: 0.25;
}
</style>
