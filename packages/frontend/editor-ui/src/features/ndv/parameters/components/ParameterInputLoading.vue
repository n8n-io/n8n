<script setup lang="ts">
import { N8nLoading2 } from '@n8n/design-system';

/**
 * Placeholder for a module-contributed input while its chunk loads.
 *
 * `defineAsyncComponent` renders nothing until the loader settles, so without
 * this the field is absent and everything below it moves once the real input
 * arrives. The row is reserved at the standard input height instead.
 *
 * The shell passes `ParameterInputProps` to whatever occupies the input slot;
 * this placeholder needs none of them, so they are dropped rather than landing
 * on the DOM as attributes.
 */
defineOptions({ inheritAttrs: false });
</script>

<template>
	<div :class="$style.container" data-test-id="parameter-input-loading">
		<N8nLoading2 variant="rect" :class="$style.skeleton" />
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	align-items: center;
	width: 100%;
	height: var(--height--lg);
}

.skeleton {
	width: 100%;
}
</style>
