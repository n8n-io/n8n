<script setup lang="ts">
import { N8nIcon } from '@n8n/design-system';

defineProps<{
	icon: InstanceType<typeof N8nIcon>['$props']['icon'];
	label: string;
}>();
</script>

<template>
	<a :class="$style.link">
		<N8nIcon :icon="icon" aria-hidden="true" :class="$style.icon" />
		{{ label }}
	</a>
</template>

<style module>
.icon {
	transform: translateY(2px);
}
.link {
	display: inline-flex;
	align-items: baseline;
	gap: var(--spacing--3xs);
	font-size: inherit;
}
</style>
