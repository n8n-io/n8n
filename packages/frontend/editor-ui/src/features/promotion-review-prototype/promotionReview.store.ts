import type {
	PromotionReviewPlanResponse,
	PromotionReviewSummary,
	PromotionTargetCredential,
} from '@n8n/api-types';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import * as promotionReviewApi from './promotionReview.api';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

export const usePromotionReviewStore = defineStore('promotionReviewPrototype', () => {
	const rootStore = useRootStore();
	const projectsStore = useProjectsStore();

	const pendingPromotions = ref<PromotionReviewSummary[]>([]);
	const selectedPromotionId = ref<string | null>(null);
	const selectedProjectId = ref<string | null>(null);
	const plan = ref<PromotionReviewPlanResponse | null>(null);
	const usableCredentials = ref<PromotionTargetCredential[]>([]);
	const credentialBindings = ref<Record<string, string>>({});
	const isLoading = ref(false);
	const isPlanning = ref(false);
	const planError = ref<string | null>(null);

	const importableProjects = computed(() => {
		const projects = [
			...(projectsStore.personalProject ? [projectsStore.personalProject] : []),
			...projectsStore.myProjects,
		];
		const seen = new Set<string>();

		return projects.filter((project) => {
			if (seen.has(project.id)) return false;
			seen.add(project.id);
			const scopes = project.scopes ?? [];
			return (
				scopes.includes('workflow:import') ||
				scopes.includes('workflow:create') ||
				project.type === 'personal'
			);
		});
	});

	async function loadProjects() {
		await Promise.all([projectsStore.getPersonalProject(), projectsStore.getMyProjects()]);
		if (!selectedProjectId.value) {
			selectedProjectId.value =
				projectsStore.personalProject?.id ?? importableProjects.value[0]?.id ?? null;
		}
	}

	async function loadPending() {
		isLoading.value = true;
		try {
			pendingPromotions.value = await promotionReviewApi.fetchPendingPromotions(
				rootStore.restApiContext,
			);
		} finally {
			isLoading.value = false;
		}
	}

	async function loadUsableCredentials() {
		if (!selectedProjectId.value) {
			usableCredentials.value = [];
			return;
		}

		usableCredentials.value = await promotionReviewApi.fetchUsableCredentials(
			rootStore.restApiContext,
			selectedProjectId.value,
		);
	}

	async function selectPromotion(promotionId: string) {
		await loadProjects();
		selectedPromotionId.value = promotionId;
		plan.value = null;
		credentialBindings.value = {};
		planError.value = null;
		await loadUsableCredentials();
		await runPlan();
	}

	async function setProjectId(projectId: string) {
		selectedProjectId.value = projectId;
		credentialBindings.value = {};
		await loadUsableCredentials();
		await runPlan();
	}

	async function runPlan() {
		if (!selectedPromotionId.value) {
			plan.value = null;
			return;
		}

		isPlanning.value = true;
		planError.value = null;
		try {
			plan.value = await promotionReviewApi.planPromotion(
				rootStore.restApiContext,
				selectedPromotionId.value,
				{
					projectId: selectedProjectId.value ?? undefined,
					credentialBindings: credentialBindings.value,
				},
			);
			if (!selectedProjectId.value) {
				selectedProjectId.value = plan.value.targetProjectId;
				await loadUsableCredentials();
			}
			credentialBindings.value = { ...plan.value.resolvedCredentialBindings };
		} catch (error) {
			plan.value = null;
			planError.value = error instanceof Error ? error.message : String(error);
		} finally {
			isPlanning.value = false;
		}
	}

	async function setCredentialBinding(sourceId: string, targetId: string) {
		credentialBindings.value = { ...credentialBindings.value, [sourceId]: targetId };
		await runPlan();
	}

	async function approveSelected() {
		if (!selectedPromotionId.value || !selectedProjectId.value || !plan.value?.canApply) {
			return false;
		}

		await promotionReviewApi.approvePromotion(rootStore.restApiContext, selectedPromotionId.value, {
			projectId: selectedProjectId.value,
			credentialBindings: credentialBindings.value,
		});

		selectedPromotionId.value = null;
		plan.value = null;
		credentialBindings.value = {};
		await loadPending();
		return true;
	}

	async function rejectSelected() {
		if (!selectedPromotionId.value) return;

		await promotionReviewApi.rejectPromotion(rootStore.restApiContext, selectedPromotionId.value);

		selectedPromotionId.value = null;
		plan.value = null;
		credentialBindings.value = {};
		await loadPending();
	}

	function clearSelection() {
		selectedPromotionId.value = null;
		plan.value = null;
		planError.value = null;
		credentialBindings.value = {};
	}

	return {
		pendingPromotions,
		selectedPromotionId,
		selectedProjectId,
		importableProjects,
		plan,
		usableCredentials,
		credentialBindings,
		isLoading,
		isPlanning,
		planError,
		loadProjects,
		loadPending,
		loadUsableCredentials,
		selectPromotion,
		setProjectId,
		runPlan,
		setCredentialBinding,
		approveSelected,
		rejectSelected,
		clearSelection,
	};
});
