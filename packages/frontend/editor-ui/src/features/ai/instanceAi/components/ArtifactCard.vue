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
				: '/home/datatables';
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
	gap: var(--spacing--xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--xl);
	background: var(--color--background);
	cursor: pointer;
	margin: var(--spacing--2xs) 0;

	&:hover {
		background: var(--color--background--shade-1);
	}
}

.icon {
	color: var(--color--text--tint-1);
	flex-shrink: 0;
}

.content {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.name {
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.metadata {
	font-size: var(--font-size--xs);
	color: var(--color--text--tint-2);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
