<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { N8nActionBox } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import ProjectHeader from '@/features/collaboration/projects/components/ProjectHeader.vue';
import ResourcesListLayout from '@/app/components/layouts/ResourcesListLayout.vue';
import InsightsSummary from '@/features/execution/insights/components/InsightsSummary.vue';
import { useInsightsStore } from '@/features/execution/insights/insights.store';
import { useProjectPages } from '@/features/collaboration/projects/composables/useProjectPages';
import { listAgents } from '../composables/useAgentApi';
import type { AgentResource } from '../types';
import { AGENT_BUILDER_VIEW } from '../constants';
import AgentCard from '../components/AgentCard.vue';

const locale = useI18n();

const route = useRoute();
const router = useRouter();
const rootStore = useRootStore();
const projectsStore = useProjectsStore();
const insightsStore = useInsightsStore();
const projectPages = useProjectPages();

const allAgents = ref<AgentResource[]>([]);
const loading = ref(true);

const projectId = computed(
	() => (route.params.projectId as string) ?? projectsStore.personalProject?.id ?? '',
);

const sortFns = {
	lastUpdated: (a: AgentResource, b: AgentResource) =>
		new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
	lastCreated: (a: AgentResource, b: AgentResource) =>
		new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
	nameAsc: (a: AgentResource, b: AgentResource) => a.name.localeCompare(b.name),
	nameDesc: (a: AgentResource, b: AgentResource) => b.name.localeCompare(a.name),
};

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

function onAgentPublished(updated: AgentResource) {
	allAgents.value = allAgents.value.map((a) => (a.id === updated.id ? updated : a));
}

function onAgentUnpublished(updated: AgentResource) {
	allAgents.value = allAgents.value.map((a) => (a.id === updated.id ? updated : a));
}

function onAgentDeleted(agentId: string) {
	allAgents.value = allAgents.value.filter((a) => a.id !== agentId);
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
		:display-name="(agent: AgentResource) => agent.name"
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
				:heading="locale.baseText('agents.list.empty.heading')"
				:description="locale.baseText('agents.list.empty.description')"
			/>
		</template>

		<template #default="{ data }">
			<AgentCard
				class="mb-2xs"
				:agent="data"
				:project-id="projectId"
				@select="onSelectAgent"
				@published="onAgentPublished"
				@unpublished="onAgentUnpublished"
				@deleted="onAgentDeleted"
			/>
		</template>
	</ResourcesListLayout>
</template>
