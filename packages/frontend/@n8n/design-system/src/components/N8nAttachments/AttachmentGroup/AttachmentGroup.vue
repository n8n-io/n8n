<script setup lang="ts">
import { onMounted, onUpdated, ref, useTemplateRef } from 'vue';

defineSlots<{
	/** Attachment items supplied by the feature component. */
	default(): unknown;
}>();

const isStacked = ref<boolean>(true);
const group = useTemplateRef<HTMLDivElement>('group');

/** Keep offsets in step with the rendered slot items, including list fragments. */
function updateItemIndices() {
	if (!group.value) return;

	Array.from(group.value.children).forEach((child, index) => {
		if (child instanceof HTMLElement) {
			child.style.setProperty('--attachment-index', String(index));
		}
	});
}

onMounted(updateItemIndices);
onUpdated(updateItemIndices);

function onHover(event: MouseEvent) {
	if (event.type === 'mouseenter') {
		isStacked.value = false;
	} else {
		isStacked.value = true;
	}
}
</script>

<template>
	<div
		ref="group"
		:class="[$style.group, { [$style.stacked]: isStacked }]"
		@mouseenter="onHover"
		@mouseleave="onHover"
	>
		<slot />
	</div>
</template>

<style module lang="scss">
@use '../../../css/mixins/motion';
@use '../../../css/mixins/mixins' as scrollbar-mixins;

.group {
	--attachment-direction: 1;

	display: flex;
	flex-direction: row;
	overflow-x: scroll;

	@include scrollbar-mixins.hoverable-scroll-bar;
	@include scrollbar-mixins.scroll-mask(right);

	&:dir(rtl) {
		--attachment-direction: -1;
	}

	> * {
		flex-shrink: 0;
		transform: translateX(
				calc(
					var(--attachment-direction) * var(--attachment-index, 0) *
						(var(--spacing--xs) + var(--spacing--4xs))
				)
			)
			rotate(0deg);
		transition: transform var(--duration--snappy) var(--easing--ease-in-out);

		@include motion.reduced-motion;
	}

	> :not(:first-child) {
		margin-inline-start: calc(-1 * var(--spacing--xs));
	}
}

.group.stacked {
	> :nth-child(odd) {
		transform: translateX(0) rotate(-3deg);
	}

	> :nth-child(even) {
		transform: translateX(0) rotate(3deg);
	}
}
</style>
