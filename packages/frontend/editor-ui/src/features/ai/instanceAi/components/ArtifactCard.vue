<script lang="ts" setup>
import { N8nCard, N8nIcon, N8nText, type IconName } from '@n8n/design-system';
import { computed, inject } from 'vue';

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
	<N8nCard hoverable :class="$style.card" @click="handleClick">
		<template #prepend>
			<N8nIcon :icon="icon" size="large" :class="$style.icon" />
		</template>
		<template #header>
			<N8nText>{{ props.name }}</N8nText>
		</template>
		<N8nText v-if="props.metadata" :class="$style.metadata">{{ props.metadata }}</N8nText>
	</N8nCard>
</template>

<style lang="scss" module>
.card {
	cursor: pointer;
}

.icon {
	color: var(--icon-color--strong);
	flex-shrink: 0;
}

.name {
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--regular);
	color: var(--color--text);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.metadata {
	color: var(--color--text--tint-2);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
