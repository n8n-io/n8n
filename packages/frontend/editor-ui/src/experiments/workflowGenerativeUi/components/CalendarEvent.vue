<script setup lang="ts">
import InteractiveSurface from './InteractiveSurface.vue';
import NodeBrand from './NodeBrand.vue';

defineProps<{
	title: string;
	when: string;
	attendees?: string | null;
	nodeId?: string | null;
	pressBound?: boolean;
}>();

defineEmits<{ press: [] }>();
</script>

<template>
	<InteractiveSurface
		:node-id="nodeId"
		:label="title"
		:press-bound="pressBound"
		@press="$emit('press')"
	>
		<article :class="$style.event" data-test-id="calendar-event">
			<div :class="$style.binding" aria-hidden="true">
				<i :class="$style.ring" />
				<i :class="$style.ring" />
			</div>
			<div :class="$style.card">
				<header :class="$style.header">
					<NodeBrand :node-id="nodeId" :size="16" />
					<span :class="$style.kind">Calendar event</span>
				</header>
				<h4 :class="$style.title">{{ title }}</h4>
				<p :class="$style.when">{{ when }}</p>
				<p v-if="attendees" :class="$style.attendees" data-test-id="calendar-attendees">
					{{ attendees }}
				</p>
			</div>
		</article>
	</InteractiveSurface>
</template>

<style lang="scss" module>
.event {
	display: flex;
	flex-direction: column;
	min-width: 0;
	background: var(--background--surface);
	border: var(--border);
	border-radius: var(--radius--md);
	overflow: hidden;
}

.binding {
	display: flex;
	gap: var(--spacing--sm);
	justify-content: center;
	padding: var(--spacing--3xs) 0;
	background: var(--background--subtle);
	border-bottom: var(--border);
}

.ring {
	width: var(--spacing--2xs);
	height: var(--spacing--2xs);
	background: var(--border-color--strong);
	border-radius: var(--radius--full);
}

.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	min-width: 0;
	padding: var(--spacing--sm);
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.kind {
	color: var(--text-color--subtler);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--medium);
	letter-spacing: var(--letter-spacing--wide);
	text-transform: uppercase;
}

.title {
	margin: 0;
	color: var(--text-color);
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--bold);
	line-height: var(--line-height--lg);
}

.when {
	margin: 0;
	color: var(--text-color);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
}

.attendees {
	margin: 0;
	color: var(--text-color--subtle);
	font-size: var(--font-size--xs);
	overflow-wrap: anywhere;
}
</style>
