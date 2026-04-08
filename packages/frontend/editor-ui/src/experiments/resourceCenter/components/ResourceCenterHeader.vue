<script setup lang="ts"></script>

<template>
	<header :class="$style.header">
		<div :class="$style.content">
			<slot />
		</div>
		<div v-if="$slots.actions" :class="$style.actions">
			<slot name="actions" />
		</div>
	</header>
</template>

<style lang="scss" module>
.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: var(--spacing--md);
	margin-bottom: var(--spacing--xl);
	padding: var(--spacing--xs) 0;
	border-bottom: var(--border);
	height: 55px;
}

.content {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}
</style>
