<script setup lang="ts">
import ActionCard from './ActionCard.vue';
defineProps<{ to: string; subject: string; bodyPreview: string; nodeId?: string | null }>();
defineEmits<{ press: [] }>();
</script>
<template>
	<ActionCard :node-id="nodeId" label="Email" :title="subject" @press="$emit('press')"
		><dl :class="$style.details">
			<div>
				<dt>To</dt>
				<dd>{{ to }}</dd>
			</div>
			<div>
				<dt>Subject</dt>
				<dd>{{ subject }}</dd>
			</div>
		</dl>
		<p :class="$style.body">{{ bodyPreview }}</p></ActionCard
	>
</template>
<style lang="scss" module>
.details {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin: 0;
}
.details div {
	display: grid;
	grid-template-columns: var(--spacing--2xl) 1fr;
	gap: var(--spacing--2xs);
}
.details dt {
	color: var(--text-color--subtler);
}
.details dd {
	min-width: 0;
	margin: 0;
	overflow-wrap: anywhere;
}
.body {
	margin: 0;
	padding-top: var(--spacing--2xs);
	color: var(--text-color--subtle);
	border-top: var(--border);
	white-space: pre-wrap;
}
</style>
