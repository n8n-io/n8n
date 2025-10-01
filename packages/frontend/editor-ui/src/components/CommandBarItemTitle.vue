<script lang="ts" setup>
defineProps<{
	title: string;
	suffix?: string;
}>();
</script>

<template>
	<span :class="$style.container">
		<span :class="$style.title">{{ title }}</span>
		<span v-if="suffix" :class="$style.suffix">{{ suffix }}</span>
	</span>
</template>

<style lang="scss" module>
.container {
	display: flex;
	gap: var(--spacing-3xs);
	align-items: center;
	min-width: 0;
}

.title {
	color: var(--color-text-dark);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	flex-shrink: 1;
	min-width: 0;
}

.suffix {
	color: var(--color-text-light);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	max-width: 50%;
}
</style>
