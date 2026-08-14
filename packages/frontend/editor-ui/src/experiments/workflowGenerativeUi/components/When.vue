<script setup lang="ts">
import { computed } from 'vue';
import InteractiveSurface from './InteractiveSurface.vue';
import NodeBrand from './NodeBrand.vue';

const props = defineProps<{
	kind: 'schedule' | 'form' | 'webhook' | 'chat' | 'email' | 'file' | 'appEvent' | 'manual';
	summary: string;
	app?: string | null;
	nodeId?: string | null;
	pressBound?: boolean;
}>();

defineEmits<{ press: [] }>();

const kindNames: Record<typeof props.kind, string> = {
	schedule: 'Schedule',
	form: 'Form',
	webhook: 'Webhook',
	chat: 'Chat',
	email: 'Email',
	file: 'File',
	appEvent: 'App event',
	manual: 'Manual',
};

const kindName = computed(() => kindNames[props.kind]);
const label = computed(() => `${kindName.value} trigger`);
const title = computed(() => props.app ?? kindName.value);
</script>

<template>
	<InteractiveSurface
		:node-id="nodeId"
		:label="title"
		:press-bound="pressBound"
		@press="$emit('press')"
	>
		<section :class="$style.trigger" data-test-id="trigger-marker">
			<span :class="$style.kind">{{ label }}</span>
			<div :class="$style.source">
				<NodeBrand :node-id="nodeId" :size="24" />
				<strong :class="$style.title">{{ title }}</strong>
			</div>
			<p :class="$style.summary">{{ summary }}</p>
		</section>
	</InteractiveSurface>
</template>

<style lang="scss" module>
.trigger {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 0;
	padding: var(--spacing--xs) var(--spacing--sm);
	background: var(--background--subtle);
	border-left: var(--spacing--4xs) solid var(--color--primary);
	border-radius: 0 var(--radius--md) var(--radius--md) 0;
}

.kind {
	align-self: flex-start;
	padding: var(--spacing--5xs) var(--spacing--2xs);
	color: var(--color--primary);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	letter-spacing: var(--letter-spacing--wide);
	text-transform: uppercase;
	background: var(--background--surface);
	border-radius: var(--radius--full);
}

.source {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.title {
	overflow: hidden;
	color: var(--text-color);
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--bold);
	line-height: var(--line-height--lg);
	text-overflow: ellipsis;
	white-space: nowrap;
}

.summary {
	margin: 0;
	color: var(--text-color--subtle);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
}
</style>
