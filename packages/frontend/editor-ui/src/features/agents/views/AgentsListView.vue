<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { N8nActionBox, N8nActionDropdown, N8nCard, N8nText } from '@n8n/design-system';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import ProjectHeader from '@/features/collaboration/projects/components/ProjectHeader.vue';
import ResourcesListLayout from '@/app/components/layouts/ResourcesListLayout.vue';
import InsightsSummary from '@/features/execution/insights/components/InsightsSummary.vue';
import { useInsightsStore } from '@/features/execution/insights/insights.store';
import { useProjectPages } from '@/features/collaboration/projects/composables/useProjectPages';
import { listAgents, deleteAgent, type AgentDto } from '../composables/useAgentApi';
import { AGENT_BUILDER_VIEW } from '../constants';

const route = useRoute();
const router = useRouter();
const rootStore = useRootStore();
const projectsStore = useProjectsStore();
const insightsStore = useInsightsStore();
const projectPages = useProjectPages();

const allAgents = ref<AgentDto[]>([]);
const loading = ref(true);

const projectId = computed(
	() => (route.params.projectId as string) ?? projectsStore.personalProject?.id ?? '',
);

const sortFns = {
	lastUpdated: (a: AgentDto, b: AgentDto) =>
		new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
	lastCreated: (a: AgentDto, b: AgentDto) =>
		new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
	nameAsc: (a: AgentDto, b: AgentDto) => a.name.localeCompare(b.name),
	nameDesc: (a: AgentDto, b: AgentDto) => b.name.localeCompare(a.name),
};

const cardActions = [{ id: 'delete', label: 'Delete' }];

async function fetchAgents() {
	loading.value = true;
	try {
		allAgents.value = await listAgents(rootStore.restApiContext, projectId.value);
	} finally {
		loading.value = false;
	}
}

function onSelectAgent(agentId: string) {
	void router.push({
		name: AGENT_BUILDER_VIEW,
		params: { projectId: projectId.value, agentId },
	});
}

async function onCardAction(action: string, agent: AgentDto) {
	if (action === 'delete') {
		await deleteAgent(rootStore.restApiContext, projectId.value, agent.id);
		allAgents.value = allAgents.value.filter((a) => a.id !== agent.id);
	}
}

function formatDate(dateStr: string): string {
	return new Date(dateStr).toLocaleDateString(undefined, {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	});
}

onMounted(fetchAgents);
</script>

<template>
	<ResourcesListLayout
		resource-key="agents"
		:resources="allAgents"
		:loading="loading"
		:disabled="false"
		:sort-fns="sortFns"
		:sort-options="['lastUpdated', 'lastCreated', 'nameAsc', 'nameDesc']"
		:type-props="{ itemSize: 80 }"
		:shareable="false"
		:ui-config="{ searchEnabled: true, showFiltersDropdown: false, sortEnabled: true }"
		:display-name="(agent: AgentDto) => agent.name"
		tab-key="agents"
	>
		<template #header>
			<ProjectHeader main-button="agent">
				<InsightsSummary
					v-if="projectPages.isOverviewSubPage && insightsStore.isSummaryEnabled"
					:loading="insightsStore.weeklySummary.isLoading"
					:summary="insightsStore.weeklySummary.state"
					time-range="week"
				/>
			</ProjectHeader>
		</template>

		<template #empty>
			<N8nActionBox
				heading="No agents yet"
				description="Create your first agent to get started building with the n8n agents SDK. Use the button in the top right to create one."
			/>
		</template>

		<template #default="{ data }">
			<N8nCard
				:class="$style.card"
				hoverable
				data-testid="agent-card"
				@click="onSelectAgent(data.id)"
			>
				<template #header>
					<div :class="$style.cardHeader">
						<N8nText tag="h2" bold :class="$style.cardName">{{ data.name }}</N8nText>
					</div>
				</template>
				<div :class="$style.cardDescription">
					<N8nText size="small" color="text-light">
						{{ data.description || 'No description' }}
					</N8nText>
					<N8nText size="small" color="text-light">
						Updated {{ formatDate(data.updatedAt) }}
					</N8nText>
				</div>
				<template #append>
					<div :class="$style.cardActions" @click.stop>
						<N8nActionDropdown
							:items="cardActions"
							data-testid="agent-card-actions"
							@select="onCardAction($event, data)"
						/>
					</div>
				</template>
			</N8nCard>
		</template>
	</ResourcesListLayout>
</template>

<style module>
.card {
	cursor: pointer;
	padding: 0;
	align-items: stretch;
	transition: box-shadow 0.3s ease;
	margin-bottom: var(--spacing--2xs);
}

.card:hover {
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.cardHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm) 0 0 var(--spacing--sm);
}

.cardName {
	font-size: var(--font-size--sm);
}

.cardDescription {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: 0 0 var(--spacing--sm) var(--spacing--sm);
	min-height: var(--spacing--xl);
}

.cardActions {
	display: flex;
	align-items: center;
	padding: 0 var(--spacing--sm) 0 0;
}
</style>
