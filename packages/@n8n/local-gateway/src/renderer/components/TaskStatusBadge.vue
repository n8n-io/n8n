<script setup lang="ts">
defineProps<{ variant: 'actionNeeded' | 'scheduled' | 'watching'; label: string }>();
</script>

<template>
	<span :class="[$style.badge, $style[variant]]">{{ label }}</span>
</template>

<style module>
/* Prototype zj: font-size 10px, font-weight 600, padding 2px 7px, border-radius 20px */
.badge {
	display: inline-flex;
	align-items: center;
	padding: var(--spacing--5xs) 7px;
	border-radius: var(--radius--full);
	font-size: 10px;
	font-weight: 600;
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
