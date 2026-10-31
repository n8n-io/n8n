<script setup lang="ts">
/**
 * Vertical guide lines of one row in the workflows list tree. Each parent folder of the row
 * has one line. The lines of the folders above the hovered row are highlighted.
 * The parent element must be positioned.
 */
withDefaults(defineProps<{ depth?: number; highlightDepth?: number }>(), {
	depth: 0,
	highlightDepth: 0,
});
</script>

<template>
	<span v-if="depth > 0" :class="$style.guides" aria-hidden="true">
		<span
			v-for="level in depth"
			:key="level"
			:class="{ [$style.guide]: true, [$style.highlighted]: level <= highlightDepth }"
			:style="{ '--guide-level': level - 1 }"
		/>
	</span>
</template>

<style lang="scss" module>
@use '@/app/css/workflows-list';

.guides {
	position: absolute;
	inset: 0;
	pointer-events: none;
}

.guide {
	position: absolute;
	top: 0;
	bottom: 0;
	left: calc(#{workflows-list.$guide-offset} + var(--guide-level) * #{workflows-list.$indent});
	width: var(--border-width);
	background-color: var(--border-color--subtle);
	transition: workflows-list.$hover-transition;
}

.highlighted {
	background-color: var(--border-color--stronger);
}
</style>
