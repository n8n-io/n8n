<script setup lang="ts">
const shadows = [
	{ name: 'outline', token: 'var(--shadow--outline)' },
	{ name: '2xs', token: 'var(--shadow--2xs)' },
	{ name: 'xs', token: 'var(--shadow--xs)' },
	{ name: 'sm', token: 'var(--shadow--sm)' },
	{ name: 'md', token: 'var(--shadow--md)' },
	{ name: 'xl', token: 'var(--shadow--xl)' },
] as const;
</script>

<template>
	<div :class="$style.container">
		<div v-for="shadow in shadows" :key="shadow.name" :class="$style.item">
			<div :class="$style.label">{{ shadow.name }}</div>
			<div :class="$style.card" :style="{ boxShadow: shadow.token }" />
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: var(--spacing--lg);
	margin-block: var(--spacing--xl);
	padding: var(--spacing--lg);
	padding-bottom: calc(var(--spacing--lg) + var(--spacing--xl));
	border: 1px solid var(--border-color);
	border-radius: var(--radius--lg);
	background: light-dark(var(--color--neutral-100), var(--color--neutral-900));
	color: var(--text-color);
}

.item {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--sm);
}

.label {
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--semibold);
}

.card {
	width: var(--height--5xl);
	height: var(--height--5xl);
	border-radius: var(--radius--lg);
	background: var(--background--surface);
}
</style>
