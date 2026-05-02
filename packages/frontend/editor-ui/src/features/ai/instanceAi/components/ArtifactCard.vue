<script lang="ts" setup>
import { N8nCard, N8nIcon, N8nText, type IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, inject } from 'vue';

const i18n = useI18n();

const props = defineProps<{
	type: 'workflow' | 'data-table';
	name: string;
	resourceId: string;
	projectId?: string;
	metadata?: string;
	archived?: boolean;
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
	<N8nCard :class="[$style.card, props.archived && $style.cardArchived]" @click="handleClick">
		<template #prepend>
			<N8nIcon :icon="icon" size="large" :class="$style.icon" />
		</template>
		<template #header>
			<N8nText>{{ props.name }}</N8nText>
			<span v-if="props.archived" :class="$style.archivedBadge">
				{{ i18n.baseText('instanceAi.artifactsPanel.archived') }}
			</span>
		</template>
		<N8nText v-if="props.metadata" :class="$style.metadata">{{ props.metadata }}</N8nText>
	</N8nCard>
</template>

<style lang="scss" module>
.card {
	cursor: pointer;
	background-color: var(--color--background--light-3);
	transition: box-shadow 0.3s ease;

	&:hover {
		box-shadow: var(--shadow--card-hover);
	}
}

.cardArchived {
	opacity: 0.55;
}

.archivedBadge {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
	background: var(--color--foreground--tint-1);
	padding: var(--spacing--5xs) var(--spacing--3xs);
	border-radius: var(--radius--sm);
	margin-left: var(--spacing--2xs);
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
	/* stylelint-disable-next-line @n8n/css-var-naming -- design-system token */
	color: var(--text-color--subtler);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
