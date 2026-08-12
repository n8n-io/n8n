<script lang="ts" setup>
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useWorkflowTourStore } from '@/features/workflows/tour/workflowTour.store';
import { N8nButton, N8nCard, N8nIcon, N8nText, type IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, inject } from 'vue';

const i18n = useI18n();

const props = defineProps<{
	type: 'workflow' | 'data-table' | 'agent';
	name: string;
	resourceId: string;
	projectId?: string;
	metadata?: string;
	archived?: boolean;
	hasTourDescriptions?: boolean;
}>();

const workflowsListStore = useWorkflowsListStore();
const workflowTourStore = useWorkflowTourStore();
const openPreview = inject<((id: string) => void) | undefined>('openWorkflowPreview', undefined);
const openDataTablePreview = inject<((id: string, projectId: string) => void) | undefined>(
	'openDataTablePreview',
	undefined,
);
const openAgentPreview = inject<((id: string, projectId: string) => void) | undefined>(
	'openAgentPreview',
	undefined,
);

const iconMap: Record<string, IconName> = {
	workflow: 'workflow',
	'data-table': 'table',
	agent: 'robot',
};

const icon = computed(() => iconMap[props.type] ?? 'file');
const startTourLabel = computed(() => i18n.baseText('workflowTour.startButton'));

const hasCachedTourDescriptions = computed(() => {
	if (props.type !== 'workflow') return false;

	const workflow = workflowsListStore.getWorkflowById(props.resourceId);
	const descriptions =
		workflow?.meta && typeof workflow.meta === 'object'
			? Reflect.get(workflow.meta, 'nodeDescriptions')
			: undefined;
	if (typeof descriptions !== 'object' || descriptions === null) return false;

	return Object.values(descriptions).some((description) => {
		if (typeof description !== 'object' || description === null) return false;

		const summary = Reflect.get(description, 'summary');
		return typeof summary === 'string' && summary.trim().length > 0;
	});
});

const showTourButton = computed(
	() =>
		props.type === 'workflow' &&
		!props.archived &&
		(props.hasTourDescriptions === true || hasCachedTourDescriptions.value),
);

function projectResourceUrl(projectId: string | undefined, resourceType: 'data-table' | 'agent') {
	if (resourceType === 'agent') {
		return projectId ? `/projects/${projectId}/agents/${props.resourceId}` : '/home/agents';
	}

	return projectId ? `/projects/${projectId}/datatables/${props.resourceId}` : '/data-tables';
}

function handleClick(e: MouseEvent) {
	if (props.type === 'workflow') {
		if (e.metaKey || e.ctrlKey) {
			window.open(`/workflow/${props.resourceId}`, '_blank');
			return;
		}
		openPreview?.(props.resourceId);
	} else if (props.type === 'data-table') {
		if (e.metaKey || e.ctrlKey) {
			window.open(projectResourceUrl(props.projectId, 'data-table'), '_blank');
			return;
		}
		if (props.projectId) {
			openDataTablePreview?.(props.resourceId, props.projectId);
		}
	} else if (props.type === 'agent') {
		if (e.metaKey || e.ctrlKey) {
			window.open(projectResourceUrl(props.projectId, 'agent'), '_blank');
			return;
		}
		if (props.projectId) {
			openAgentPreview?.(props.resourceId, props.projectId);
		}
	}
}

function handleStartTour() {
	openPreview?.(props.resourceId);
	workflowTourStore.requestTour(props.resourceId);
}
</script>

<template>
	<N8nCard
		data-test-id="instance-ai-artifact-card"
		:class="[$style.card, props.archived && $style.cardArchived]"
		@click="handleClick"
	>
		<template #prepend>
			<N8nIcon :icon="icon" size="large" :class="$style.icon" />
		</template>
		<template #header>
			<N8nText>{{ props.name }}</N8nText>
			<span v-if="props.archived" :class="$style.archivedBadge">
				{{ i18n.baseText('instanceAi.artifactsPanel.archived') }}
			</span>
		</template>
		<N8nText v-if="props.metadata" color="text-light" :class="$style.metadata">
			{{ props.metadata }}
		</N8nText>
		<div v-if="showTourButton" :class="$style.actions">
			<N8nButton
				variant="subtle"
				size="small"
				icon="book-open"
				:label="startTourLabel"
				data-test-id="instance-ai-artifact-start-tour-button"
				@click.stop="handleStartTour"
			/>
		</div>
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
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.actions {
	display: flex;
	margin-top: var(--spacing--2xs);
}
</style>
