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
	font-size: var(--font-size-2xs);
	font-weight: 400;
	line-height: 18px;
	text-align: left;
	padding-inline: var(--spacing-s);
	padding-block: var(--spacing-2xs);
	background-color: var(--color-foreground-xlight);
	display: flex;
	justify-content: space-between;
	align-items: center;
	line-height: var(--font-line-height-compact);

	&:last-child {
		/** Panel collapsed */
		cursor: pointer;
	}

	&:not(:last-child) {
		/** Panel open */
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
	color: var(--color-text-base);
	max-width: 70%;
	/* Let button heights not affect the header height */
	margin-block: calc(-1 * var(--spacing-s));
}

.actions button {
	border: none;
	color: var(--color-text-light);
}
</style>
