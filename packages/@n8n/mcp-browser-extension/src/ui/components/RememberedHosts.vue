<script setup lang="ts">
import { N8nIcon } from '@n8n/design-system';
import InfoRow from './InfoRow.vue';

defineProps<{ hosts: string[] }>();
defineEmits<{ forget: [host: string] }>();
</script>

<template>
	<div v-if="hosts.length" class="panel">
		<InfoRow
			icon="badge-check"
			title="Allowed instances"
			description="These instances connect without asking"
		>
			<ul class="host-list">
				<li v-for="host in hosts" :key="host" class="host">
					<span class="host-name">{{ host }}</span>
					<button
						class="host-remove"
						:title="`Ask before connecting to ${host}`"
						:aria-label="`Ask before connecting to ${host}`"
						@click="$emit('forget', host)"
					>
						<N8nIcon icon="x" size="small" />
					</button>
				</li>
			</ul>
		</InfoRow>
	</div>
</template>

<style scoped lang="scss">
.host-list {
	list-style: none;
	margin: var(--spacing--sm) 0 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.host {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: var(--border-width) var(--border-style) var(--color--foreground--tint-1);
	border-radius: var(--radius);
}

.host-name {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: var(--font-size--xs);
	color: var(--color--text--shade-1);
}

.host-remove {
	appearance: none;
	flex-shrink: 0;
	display: flex;
	align-items: center;
	padding: var(--spacing--4xs);
	background: transparent;
	border: none;
	border-radius: var(--radius);
	cursor: pointer;
	color: var(--text-color--subtler);

	&:hover {
		background: var(--color--background);
		color: var(--color--text--shade-1);
	}
}
</style>
