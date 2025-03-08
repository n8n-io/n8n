<script setup lang="ts">
defineProps<{ title: string }>();

defineSlots<{ actions: {} }>();

const emit = defineEmits<{ click: [] }>();
</script>

<template>
	<header :class="$style.container" @click="emit('click')">
		<span :class="$style.title">{{ title }}</span>
		<div :class="$style.actions">
			<slot name="actions" />
		</div>
	</header>
</template>

<style lang="scss" module>
.container {
	font-size: var(--font-size-s);
	font-weight: 400;
	line-height: 18px;
	text-align: left;
	padding: var(--spacing-xs);
	background-color: var(--color-foreground-xlight);
	display: flex;
	justify-content: space-between;
	align-items: center;

	&:not(:last-child) {
		border-bottom: 1px solid var(--color-foreground-base);
	}
}

.title {
	font-weight: 600;
	flex-grow: 1;
	flex-shrink: 1;
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing-2xs);
	color: var(--color-text-base);
	max-width: 70%;
}

.actions button {
	max-height: 1.1rem;
	border: none;
}
</style>
