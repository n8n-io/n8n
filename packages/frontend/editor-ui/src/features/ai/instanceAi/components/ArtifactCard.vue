<script lang="ts" setup>
import AgentPersonalisationIcon from '@/features/agents/components/AgentPersonalisationIcon.vue';
import { getAgent } from '@/features/agents/composables/useAgentApi';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { AgentPersonalisation } from '@n8n/api-types';
import { N8nBadge, N8nCard, N8nIcon, N8nText, type IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, inject, ref, watch } from 'vue';
import { useArtifactLinks } from '../artifactLinks';

const i18n = useI18n();
const { openArtifactInNewTab } = useArtifactLinks();

const props = defineProps<{
	type: 'workflow' | 'data-table' | 'agent';
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
const rootStore = useRootStore();
const personalisation = ref<AgentPersonalisation>();

watch(
	() => [props.type, props.projectId, props.resourceId] as const,
	async ([type, projectId, resourceId], _previous, onCleanup) => {
		let active = true;
		onCleanup(() => {
			active = false;
		});
		personalisation.value = undefined;
		if (type !== 'agent' || !projectId) return;

		try {
			const agent = await getAgent(rootStore.restApiContext, projectId, resourceId);
			if (active) personalisation.value = agent.config?.personalisation;
		} catch {
			/** Keep the default icon when agent details are not available. */
		}
	},
	{ immediate: true },
);

function handleClick(e: MouseEvent) {
	if (e.metaKey || e.ctrlKey) {
		openArtifactInNewTab(props.type, props.resourceId, props.projectId);
		return;
	}

	if (props.type === 'workflow') {
		openPreview?.(props.resourceId);
	} else if (props.type === 'data-table') {
		if (props.projectId) {
			openDataTablePreview?.(props.resourceId, props.projectId);
		}
	} else if (props.type === 'agent') {
		if (props.projectId) {
			openAgentPreview?.(props.resourceId, props.projectId);
		}
	}
}
</script>

<template>
	<N8nCard
		data-test-id="instance-ai-artifact-card"
		:class="[$style.card, props.archived && $style.cardArchived]"
		@click="handleClick"
	>
		<template #prepend>
			<AgentPersonalisationIcon v-if="props.type === 'agent'" :personalisation="personalisation" />
			<N8nIcon v-else :icon="icon" size="large" :class="$style.icon" />
		</template>
		<template #header>
			<N8nText>{{ props.name }}</N8nText>
			<N8nBadge v-if="props.archived" variant="filled" :class="$style.archivedBadge">
				{{ i18n.baseText('instanceAi.artifactsPanel.archived') }}
			</N8nBadge>
		</template>
		<N8nText v-if="props.metadata" color="text-light" :class="$style.metadata">
			{{ props.metadata }}
		</N8nText>
	</N8nCard>
</template>

<style lang="scss" module>
.card {
	cursor: pointer;
}

.cardArchived {
	opacity: 0.55;
}

.archivedBadge {
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
</style>
