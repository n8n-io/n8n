<script setup lang="ts">
import InteractiveSurface from './InteractiveSurface.vue';
import NodeBrand from './NodeBrand.vue';

defineProps<{
	app: string;
	to: string;
	bodyPreview: string;
	nodeId?: string | null;
	pressBound?: boolean;
}>();

defineEmits<{ press: [] }>();
</script>

<template>
	<InteractiveSurface
		:node-id="nodeId"
		:label="to"
		:press-bound="pressBound"
		@press="$emit('press')"
	>
		<section :class="$style.thread" data-test-id="chat-thread">
			<header :class="$style.channel">
				<NodeBrand :node-id="nodeId" :size="16" />
				<strong :class="$style.to">{{ to }}</strong>
				<span :class="$style.app">{{ app }}</span>
			</header>
			<div :class="$style.conversation">
				<p :class="$style.bubble" data-test-id="chat-bubble">{{ bodyPreview }}</p>
			</div>
		</section>
	</InteractiveSurface>
</template>

<style lang="scss" module>
.thread {
	display: flex;
	flex-direction: column;
	min-width: 0;
	background: var(--background--surface);
	border: var(--border);
	border-radius: var(--radius--md);
	overflow: hidden;
}

.channel {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
	padding: var(--spacing--2xs) var(--spacing--sm);
	border-bottom: var(--border);
}

.to {
	overflow: hidden;
	color: var(--text-color);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	text-overflow: ellipsis;
	white-space: nowrap;
}

.app {
	margin-left: auto;
	color: var(--text-color--subtler);
	font-size: var(--font-size--3xs);
	letter-spacing: var(--letter-spacing--wide);
	text-transform: uppercase;
}

.conversation {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm);
	background: var(--background--subtle);
}

.bubble {
	max-width: 85%;
	margin: 0;
	padding: var(--spacing--2xs) var(--spacing--xs);
	color: var(--text-color);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	background: var(--background--surface);
	border: var(--border);
	border-radius: var(--radius--md) var(--radius--md) var(--radius--md) var(--radius--4xs);
	overflow-wrap: anywhere;
}
</style>
