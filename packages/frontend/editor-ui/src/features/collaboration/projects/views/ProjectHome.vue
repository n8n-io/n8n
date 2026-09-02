<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { ExecutionSummary } from 'n8n-workflow';
import ProjectHeader from '@/features/collaboration/projects/components/ProjectHeader.vue';
import InsightsSummary from '@/features/execution/insights/components/InsightsSummary.vue';
import { useInsightsStore } from '@/features/execution/insights/insights.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { ProjectTypes } from '@/features/collaboration/projects/projects.types';
import ProjectHomeAttention from '../home/ProjectHomeAttention.vue';
import type { FailingWorkflow } from '../home/ProjectHomeAttention.vue';
import ProjectHomeRecents from '../home/ProjectHomeRecents.vue';

interface ExecutionsListResponse {
	count: number;
	results: ExecutionSummary[];
	estimated: boolean;
}

const route = useRoute();
const rootStore = useRootStore();
const insightsStore = useInsightsStore();
const projectsStore = useProjectsStore();

const projectId = computed(() => route.params.projectId as string);

const isTeamProject = computed(() => projectsStore.currentProject?.type === ProjectTypes.Team);

const showInsights = computed(
	() => insightsStore.isInsightsEnabled && insightsStore.hasProjectInsightsAccess(projectId.value),
);

const failures = ref<FailingWorkflow[]>([]);
const failuresLoading = ref(true);

async function fetchFailures() {
	failuresLoading.value = true;
	try {
		const data = await makeRestApiRequest<ExecutionsListResponse>(
			rootStore.restApiContext,
			'GET',
			'/executions',
			{
				filter: { projectId: projectId.value, status: ['error'] },
				limit: 50,
			},
		);
		const byWorkflow = new Map<string, FailingWorkflow>();
		for (const execution of data.results) {
			const failedAt = new Date(execution.stoppedAt ?? execution.startedAt ?? Date.now());
			const existing = byWorkflow.get(execution.workflowId);
			if (existing) {
				existing.count += 1;
				if (failedAt > existing.lastFailedAt) {
					existing.lastFailedAt = failedAt;
					existing.lastExecutionId = execution.id;
				}
			} else {
				byWorkflow.set(execution.workflowId, {
					workflowId: execution.workflowId,
					workflowName: execution.workflowName ?? execution.workflowId,
					count: 1,
					lastFailedAt: failedAt,
					lastExecutionId: execution.id,
				});
			}
		}
		failures.value = [...byWorkflow.values()]
			.sort((a, b) => b.lastFailedAt.getTime() - a.lastFailedAt.getTime())
			.slice(0, 5);
	} catch {
		failures.value = [];
	} finally {
		failuresLoading.value = false;
	}
}

watch(
	projectId,
	(id) => {
		if (!id) return;
		void fetchFailures();
		if (insightsStore.hasProjectInsightsAccess(id)) {
			void insightsStore.fetchProjectSummary(id);
		}
	},
	{ immediate: true },
);
</script>

<template>
	<div :class="$style.page" data-test-id="project-home">
		<div :class="$style.content">
			<ProjectHeader />
			<InsightsSummary
				v-if="showInsights"
				:loading="insightsStore.projectSummary.isLoading"
				:summary="insightsStore.projectSummary.state"
				:project-id="projectId"
				:class="$style.insights"
			/>
			<ProjectHomeAttention
				:key="projectId"
				:project-id="projectId"
				:is-team-project="isTeamProject"
				:failures="failures"
				:failures-loading="failuresLoading"
				@refresh-failures="fetchFailures"
			/>
			<ProjectHomeRecents :key="`recents-${projectId}`" :project-id="projectId" />
		</div>
	</div>
</template>

<style lang="scss" module>
.page {
	height: 100%;
	overflow: auto;
	padding: var(--spacing--lg) var(--spacing--2xl);
}

.content {
	max-width: 1280px;
	margin: 0 auto;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.insights {
	margin-bottom: var(--spacing--xs);
}
</style>
