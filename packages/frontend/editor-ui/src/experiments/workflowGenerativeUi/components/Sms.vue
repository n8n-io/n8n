<script setup lang="ts">
import InteractiveSurface from './InteractiveSurface.vue';
import NodeBrand from './NodeBrand.vue';

defineProps<{
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
		<section :class="$style.handset" data-test-id="sms-message">
			<header :class="$style.header">
				<NodeBrand :node-id="nodeId" :size="16" />
				<strong :class="$style.to">{{ to }}</strong>
				<span :class="$style.channel">SMS</span>
			</header>
			<p :class="$style.bubble" data-test-id="sms-bubble">{{ bodyPreview }}</p>
		</section>
	</InteractiveSurface>
</template>

<style lang="scss" module>
.handset {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 0;
	padding: var(--spacing--sm);
	background: var(--background--surface);
	border: var(--border);
	border-radius: var(--radius--lg);
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.to {
	overflow: hidden;
	color: var(--text-color);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	text-overflow: ellipsis;
	white-space: nowrap;
}

.channel {
	margin-left: auto;
	color: var(--text-color--subtler);
	font-size: var(--font-size--3xs);
	letter-spacing: var(--letter-spacing--wide);
}

.bubble {
	max-width: 85%;
	margin: 0;
	padding: var(--spacing--2xs) var(--spacing--xs);
	color: var(--text-color);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	background: var(--background--info);
	border: var(--border);
	border-color: var(--border-color--info);
	border-radius: var(--radius--lg) var(--radius--lg) var(--radius--lg) var(--radius--4xs);
	overflow-wrap: anywhere;
}
</style>
