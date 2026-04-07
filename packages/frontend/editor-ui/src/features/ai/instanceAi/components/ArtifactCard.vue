<script lang="ts" setup>
import { computed, inject } from 'vue';
import { N8nIcon, type IconName } from '@n8n/design-system';

const props = defineProps<{
	type: 'workflow' | 'data-table';
	name: string;
	resourceId: string;
	projectId?: string;
	metadata?: string;
}>();

const openPreview = inject<((id: string) => void) | undefined>('openWorkflowPreview', undefined);
const openDataTablePreview = inject<((id: string, projectId: string) => void) | undefined>(
	'openDataTablePreview',
	undefined,
);

const iconMap: Record<string, IconName> = {
	workflow: 'workflow',
	'data-table': 'table',
};

const icon = computed(() => iconMap[props.type] ?? 'file');

function handleClick(e: MouseEvent) {
	if (props.type === 'workflow') {
		if (e.metaKey || e.ctrlKey) {
			window.open(`/workflow/${props.resourceId}`, '_blank');
			return;
		}
		openPreview?.(props.resourceId);
	} else if (props.type === 'data-table') {
		if (e.metaKey || e.ctrlKey) {
			const url = props.projectId
				? `/projects/${props.projectId}/datatables/${props.resourceId}`
				: '/data-tables';
			window.open(url, '_blank');
			return;
		}
		if (props.projectId) {
			openDataTablePreview?.(props.resourceId, props.projectId);
		}
	}
}
</script>

<template>
	<div :class="$style.card" @click="handleClick">
		<N8nIcon :icon="icon" size="medium" :class="$style.icon" />
		<div :class="$style.content">
			<span :class="$style.name">{{ props.name }}</span>
			<span v-if="props.metadata" :class="$style.metadata">{{ props.metadata }}</span>
		</div>
	</div>
</template>

<style lang="scss" module>
.card {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--color--background--light-2);
	cursor: pointer;
	margin: var(--spacing--xs) 0;
	transition: box-shadow 0.3s ease;

	&:hover {
		box-shadow: 0 2px 8px rgba(68, 28, 23, 0.1);
		clip-path: inset(0 -8px -8px -8px);
	}
}

.icon {
	color: var(--color--text--tint-1);
	flex-shrink: 0;
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.name {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.metadata {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
