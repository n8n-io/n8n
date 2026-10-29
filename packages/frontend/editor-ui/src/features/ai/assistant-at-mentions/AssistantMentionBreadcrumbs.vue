<script setup lang="ts">
import { computed } from 'vue';

defineOptions({ name: 'AssistantMentionBreadcrumbs' });

const props = withDefaults(
	defineProps<{
		segments: readonly string[];
		/** Set on the recursive parent chain so its last segment reads as context too. */
		ancestor?: boolean;
		/**
		 * Flow the full path as wrapping text instead of trimming it to one line.
		 * For surfaces that exist to show the whole path, like the chip tooltip.
		 */
		wrap?: boolean;
	}>(),
	{ ancestor: false, wrap: false },
);

const parents = computed(() => props.segments.slice(0, -1));
const current = computed(() => props.segments[props.segments.length - 1] ?? '');
</script>

<template>
	<span :class="[$style.breadcrumbs, { [$style.wrap]: wrap }]">
		<span v-if="parents.length > 0" :class="$style.parents">
			<AssistantMentionBreadcrumbs :segments="parents" ancestor />
			<!-- Spaces are kept for the accessible name; the flex layout trims them. -->
			<span :class="[$style.separator, $style.breadcrumbAncestor]"> &gt; </span>
		</span>
		<span :class="[$style.segment, { [$style.breadcrumbAncestor]: ancestor }]">{{ current }}</span>
	</span>
</template>

<style module lang="scss">
// Trims from the outermost segment inward. Each row keeps its own (last) segment
// at its natural width and squeezes everything before it first, so the mentioned
// item stays readable and only the least specific context gives way.
.breadcrumbs {
	display: flex;
	min-width: 0;
}

// Wrap mode: everything, including the recursive ancestor rows, becomes inline
// text so the path breaks across lines instead of trimming. The separator's
// kept spaces provide the spacing here, so its flex-layout margin goes.
.wrap,
.wrap .breadcrumbs,
.wrap .parents,
.wrap .segment,
.wrap .separator {
	display: inline;
	overflow: visible;
	white-space: normal;
}

.wrap .separator {
	margin: 0;
}

.parents {
	display: flex;
	flex: 0 1 auto;
	min-width: 0;
	// Clips the separator instead of letting it overlap the segment that follows
	// when there is no room left for any context at all.
	overflow: hidden;
}

.segment {
	flex-shrink: 0;
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.separator {
	flex-shrink: 0;
	margin: 0 var(--spacing--4xs);
}

.breadcrumbAncestor {
	// Hook for containers on a dark surface (the chip tooltip) to keep ancestors
	// readable yet dimmer than the current segment.
	color: var(--breadcrumbs--color--ancestor, var(--color--text--tint-1));
}
</style>
