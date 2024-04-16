<script lang="ts" setup>
import { useCssModule } from 'vue';

const $style = useCssModule();
</script>
<template>
	<div :class="$style.mainOutputHandle" />
</template>

<style lang="scss" module>
.mainOutputHandle {
	width: 16px;
	height: 16px;
	border-radius: 100%;
	background: var(--color-foreground-xdark);

	&:hover {
		background: var(--color-primary);
	}
}
</style>
