import type {
	InstanceAiLearning,
	InstanceAiLearningReviewStatus,
	InstanceAiLearningRun,
} from '@n8n/api-types';
import { defineStore } from 'pinia';
import { ref } from 'vue';

import { AGENT_EVAL_RUN_POLL_INTERVAL } from '@/app/constants/durations';
import { useRootStore } from '@n8n/stores/useRootStore';

import * as learningsApi from './instanceAi.learnings.api';

export const useInstanceAiLearningsStore = defineStore('instanceAiLearnings', () => {
	const rootStore = useRootStore();
	const learnings = ref<InstanceAiLearning[]>([]);
	const activeRun = ref<InstanceAiLearningRun | null>(null);
	const loading = ref(false);
	const analyzing = ref(false);

	async function fetchLearnings(
		projectId: string,
		query?: { query?: string; reviewStatus?: InstanceAiLearningReviewStatus },
	) {
		loading.value = true;
		try {
			learnings.value = await learningsApi.getLearnings(rootStore.restApiContext, projectId, query);
		} finally {
			loading.value = false;
		}
	}

	async function startRun(projectId: string, workflowIds: string[], publishedOnly: boolean) {
		analyzing.value = true;
		try {
			activeRun.value = await learningsApi.startLearningRun(rootStore.restApiContext, projectId, {
				workflowIds,
				publishedOnly,
			});
			await pollRun(projectId, activeRun.value.id);
			await fetchLearnings(projectId);
		} finally {
			analyzing.value = false;
		}
	}

	async function pollRun(projectId: string, runId: string) {
		while (activeRun.value && ['queued', 'running'].includes(activeRun.value.status)) {
			await new Promise((resolve) => window.setTimeout(resolve, AGENT_EVAL_RUN_POLL_INTERVAL));
			activeRun.value = await learningsApi.getLearningRun(
				rootStore.restApiContext,
				projectId,
				runId,
			);
		}
	}

	async function updateLearning(
		projectId: string,
		learningId: string,
		payload: {
			reviewStatus?: InstanceAiLearningReviewStatus;
			enabled?: boolean;
			statement?: string;
			appliesWhen?: string;
		},
	) {
		const updated = await learningsApi.updateLearning(
			rootStore.restApiContext,
			projectId,
			learningId,
			payload,
		);
		const index = learnings.value.findIndex(({ id }) => id === learningId);
		if (index >= 0) learnings.value[index] = updated;
		return updated;
	}

	async function deleteLearning(projectId: string, learningId: string) {
		await learningsApi.deleteLearning(rootStore.restApiContext, projectId, learningId);
		learnings.value = learnings.value.filter(({ id }) => id !== learningId);
	}

	return {
		learnings,
		activeRun,
		loading,
		analyzing,
		fetchLearnings,
		startRun,
		updateLearning,
		deleteLearning,
	};
});
