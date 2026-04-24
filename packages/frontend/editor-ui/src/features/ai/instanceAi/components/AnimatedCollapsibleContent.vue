<script lang="ts" setup>
import { CollapsibleContent } from 'reka-ui';
</script>

<template>
	<CollapsibleContent :class="$style.content">
		<slot />
	</CollapsibleContent>
</template>

<style lang="scss" module>
.content {
	overflow: hidden;

	&[data-state='open'] {
		animation: slideDown 0.2s ease-out;
	}

	&[data-state='closed'] {
		animation: slideUp 0.2s ease-out;
	}
}

@keyframes slideDown {
	from {
		height: 0;
	}
	to {
		height: var(--reka-collapsible-content-height);
	}
}

@keyframes slideUp {
	from {
		height: var(--reka-collapsible-content-height);
	}
	to {
		height: 0;
	}
}
</style>
