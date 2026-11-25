<script setup lang="ts">
import type { DiffCount } from './skillVersionDiff';

/**
 * Lines removed and added, as "−2 +3". Shows nothing when nothing changed. `hideZero` leaves
 * out the side with no lines, for a file that is new or deleted.
 */
defineProps<{ count?: DiffCount; hideZero?: boolean }>();
</script>

<template>
	<span
		v-if="count && (count.added > 0 || count.removed > 0)"
		:class="$style.counts"
		data-testid="skill-diff-count"
	>
		<span v-if="!hideZero || count.removed > 0" :class="$style.removed">−{{ count.removed }}</span>
		<span v-if="!hideZero || count.added > 0" :class="$style.added">+{{ count.added }}</span>
	</span>
</template>

<style module lang="scss">
.counts {
	display: inline-flex;
	flex-shrink: 0;
	gap: var(--spacing--4xs);
	font-size: var(--font-size--3xs);
}

.removed {
	color: var(--diff--color--deleted);
}

.added {
	color: var(--diff--color--new);
}
</style>
