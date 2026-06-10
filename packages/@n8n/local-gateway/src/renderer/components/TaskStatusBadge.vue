<script setup lang="ts">
import { N8nText } from '@n8n/design-system';

defineProps<{ variant: 'actionNeeded' | 'scheduled' | 'watching'; label: string }>();
</script>

<template>
	<span :class="[$style.badge, $style[variant]]">
		<N8nText size="small" :compact="true">{{ label }}</N8nText>
	</span>
</template>

<style module>
/* Pill of accent text on a low-alpha wash of the same accent — no border
   (matches the reference badge / `.fix-btn` pattern). */
.badge {
	display: inline-flex;
	align-items: center;
	padding: 2px 9px;
	border-radius: 20px;
	white-space: nowrap;
}

.actionNeeded {
	color: var(--da-amber);
	background-color: rgba(245, 184, 75, 0.14);
}

.scheduled,
.watching {
	color: var(--da-blue);
	background-color: rgba(122, 162, 255, 0.12);
}
</style>
