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
}

.title {
	color: var(--color-text-dark);
}

.suffix {
	color: var(--color-text-light);
}
</style>
