<script setup lang="ts">
defineOptions({ name: 'N8nVersionHistoryRail' });

defineProps<{
	/**
	 * `dot` stops the line at the status dot.
	 * `icon` stops the line at the xsmall chevron.
	 */
	mark: 'dot' | 'icon';
	/** Line from the top of this row's content to the mark. */
	connectAbove?: boolean;
	/** Line from the mark to the bottom of this row's content. */
	connectBelow?: boolean;
}>();

defineSlots<{
	/** The dot or the chevron. The line meets this mark. */
	default?: () => unknown;
}>();
</script>

<template>
	<span :class="$style.rail" aria-hidden="true">
		<span
			v-if="connectAbove"
			:class="[$style.line, $style.above, $style[mark]]"
			data-test-id="version-history-line"
			data-segment="above"
		/>
		<span
			v-if="connectBelow"
			:class="[$style.line, $style.below, $style[mark]]"
			data-test-id="version-history-line"
			data-segment="below"
		/>
		<span :class="[$style.mark, mark === 'icon' && $style.iconMark]">
			<slot />
		</span>
	</span>
</template>

<style lang="scss" module>
.rail {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	flex: 0 0 auto;
	align-self: stretch;
	width: var(--version-history--rail-size, var(--spacing--lg));
	margin-inline-start: var(--version-history--rail-margin, var(--spacing--4xs));
	// Take the row background so a hover does not leave a gap around the mark.
	background-color: inherit;
	cursor: pointer;
}

.line {
	position: absolute;
	left: 50%;
	width: var(--border-width);
	transform: translateX(-50%);
	background-color: var(--color--foreground);
	pointer-events: none;
}

.above {
	top: 0;
	bottom: 50%;
}

.below {
	top: 50%;
	bottom: 0;
}

// Stop at the outer edge of the 8px status dot.
.above.dot {
	margin-bottom: calc(var(--spacing--2xs) / 2);
}

.below.dot {
	margin-top: calc(var(--spacing--2xs) / 2);
}

// The group chevron is 10px. Keep 4px clear of the track.
// Half of 10px has no spacing token.
.above.icon {
	margin-bottom: calc(5px + var(--spacing--4xs));
}

.below.icon {
	margin-top: calc(5px + var(--spacing--4xs));
}

.mark {
	position: relative;
	z-index: 1;
	display: flex;
	align-items: center;
	justify-content: center;
}

.iconMark {
	background-color: inherit;
}
</style>
