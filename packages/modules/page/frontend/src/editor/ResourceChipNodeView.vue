<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { computed } from 'vue';

import ResourceChip from '../resources/ResourceChip.vue';

const props = defineProps(nodeViewProps);

const href = computed(() => String(props.node.attrs.href));
const label = computed(() => String(props.node.attrs.label));

/** A chip that appears while the user writes was just inserted. A chip of a loaded page was not. */
const isJustInserted = props.editor.isFocused;
</script>

<template>
	<NodeViewWrapper
		as="span"
		:class="[
			$style.wrapper,
			props.selected ? $style.selected : '',
			isJustInserted ? $style.inserted : '',
		]"
	>
		<ResourceChip :href="href" :label="label" />
	</NodeViewWrapper>
</template>

<style lang="scss" module>
.wrapper {
	display: inline;
}

.selected > a {
	border-color: var(--focus--border-color);
}

.inserted > a {
	animation: chipInserted var(--duration--slow) var(--easing--ease-out);

	@media (prefers-reduced-motion: reduce) {
		animation: none;
	}
}

@keyframes chipInserted {
	from {
		background-color: color-mix(in srgb, var(--background--brand) 30%, transparent);
		box-shadow: 0 0 0 var(--spacing--5xs)
			color-mix(in srgb, var(--background--brand) 30%, transparent);
	}

	to {
		box-shadow: 0 0 0 var(--spacing--5xs) transparent;
	}
}
</style>
