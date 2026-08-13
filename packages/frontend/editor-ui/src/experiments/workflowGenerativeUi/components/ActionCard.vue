<script setup lang="ts">
import { computed } from 'vue';
import { useGenerativeUiLookOnly } from '../nodeLookup';
import NodeBrand from './NodeBrand.vue';

const props = defineProps<{
	nodeId?: string | null;
	label: string;
	title: string;
	badge?: string | null;
	pressBound?: boolean;
}>();

const emit = defineEmits<{ press: [] }>();
const lookOnly = useGenerativeUiLookOnly();
const interactive = computed(
	() => Boolean(props.nodeId) && props.pressBound !== false && !lookOnly.value,
);

function open() {
	if (interactive.value) emit('press');
}

function onKeydown(event: KeyboardEvent) {
	if (event.key !== 'Enter' && event.key !== ' ') return;
	event.preventDefault();
	open();
}

const interactiveListeners = { click: open, keydown: onKeydown };
</script>

<template>
	<div
		:class="[$style.card, { [$style.clickable]: interactive }]"
		:role="interactive ? 'button' : undefined"
		:tabindex="interactive ? 0 : undefined"
		v-on="interactive ? interactiveListeners : {}"
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
