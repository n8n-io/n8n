<script setup lang="ts">
import ActionCard from './ActionCard.vue';
defineProps<{ title: string; when: string; attendees: string | null; nodeId?: string | null }>();
defineEmits<{ press: [] }>();
</script>
<template>
	<ActionCard :node-id="nodeId" label="Calendar event" :title="title" @press="$emit('press')"
		><dl :class="$style.details">
			<div>
				<dt>When</dt>
				<dd>{{ when }}</dd>
			</div>
			<div v-if="attendees">
				<dt>Attendees</dt>
				<dd>{{ attendees }}</dd>
			</div>
		</dl></ActionCard
	>
</template>
<style lang="scss" module>
.details {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin: 0;
}
.details div {
	display: grid;
	grid-template-columns: var(--spacing--3xl) 1fr;
	gap: var(--spacing--2xs);
}
.details dt {
	color: var(--text-color--subtler);
}
.details dd {
	margin: 0;
	color: var(--text-color);
}
</style>
