<script setup lang="ts">
import { N8nTooltip } from '@n8n/design-system';

defineProps<{ name: string }>();
</script>

<template>
	<N8nTooltip as-child placement="top" :disabled="name.length === 0" :show-after="500">
		<template #content>{{ name }}</template>
		<span :class="$style.trigger">
			<slot />
		</span>
	</N8nTooltip>
</template>

<style module lang="scss">
/* Keep the trigger the size of the avatar so the row does not shift. */
.trigger {
	display: inline-flex;
	flex-shrink: 0;
	line-height: 0;
}
</style>
