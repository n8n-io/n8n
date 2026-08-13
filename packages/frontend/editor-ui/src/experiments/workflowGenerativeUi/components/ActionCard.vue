<script setup lang="ts">
import NodeBrand from './NodeBrand.vue';

const props = defineProps<{
	nodeId?: string | null;
	label: string;
	title: string;
	badge?: string | null;
}>();

const emit = defineEmits<{ press: [] }>();

function open() {
	if (props.nodeId) emit('press');
}
</script>

<template>
	<div
		:class="[$style.card, { [$style.clickable]: nodeId }]"
		:role="nodeId ? 'button' : undefined"
		:tabindex="nodeId ? 0 : undefined"
		@click="open"
		@keydown.enter.prevent="open"
		@keydown.space.prevent="open"
	>
		<header :class="$style.header">
			<NodeBrand :node-id="nodeId" />
			<div :class="$style.heading">
				<span :class="$style.label">{{ label }}</span>
				<strong :class="$style.title">{{ title }}</strong>
			</div>
			<span v-if="badge" :class="$style.badge">{{ badge }}</span>
		</header>
		<div :class="$style.body">
			<slot />
		</div>
	</div>
</template>

<style lang="scss" module>
.card {
	overflow: hidden;
	color: var(--text-color);
	background: var(--background--surface);
	border: var(--border);
	border-radius: var(--radius--sm);
	box-shadow: var(--shadow--xs);
}

.clickable {
	cursor: pointer;
	transition:
		border-color var(--duration--snappy) var(--easing--ease-out),
		box-shadow var(--duration--snappy) var(--easing--ease-out);

	&:hover {
		border-color: var(--border-color--strong);
		box-shadow: var(--shadow--sm);
	}

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--outline-color);
		outline-offset: var(--spacing--5xs);
	}
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-height: var(--height--2xl);
	padding: var(--spacing--2xs) var(--spacing--xs);
	background: var(--background--subtle);
	border-bottom: var(--border);
}

.heading {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-width: 0;
}

.label {
	color: var(--text-color--subtler);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--sm);
	letter-spacing: var(--letter-spacing--wide);
	text-transform: uppercase;
}

.title {
	overflow: hidden;
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--lg);
	text-overflow: ellipsis;
	white-space: nowrap;
}

.badge {
	padding: var(--spacing--4xs) var(--spacing--2xs);
	color: var(--text-color--subtle);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	background: var(--background--surface);
	border: var(--border);
	border-radius: var(--radius--full);
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
}
</style>
