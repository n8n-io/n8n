import { RESOURCE_CENTER_EXPERIMENT, VIEWS } from '@/app/constants';

import { useTelemetry } from '@/app/composables/useTelemetry';
import { usePostHog } from '@/app/stores/posthog.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useTemplatesStore } from '@/features/workflows/templates/templates.store';
import { useReadyToRunStore } from '@/features/workflows/readyToRun/stores/readyToRun.store';
import type { ITemplatesWorkflowFull } from '@n8n/rest-api-client/api/templates';
import type { WorkflowDataCreate } from '@n8n/rest-api-client';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { OPEN_AI_API_CREDENTIAL_TYPE, deepCopy } from 'n8n-workflow';
import { quickStartWorkflows } from '../data/quickStartWorkflows';

const LOCAL_STORAGE_CREDENTIAL_KEY = 'N8N_READY_TO_RUN_OPENAI_CREDENTIAL_ID';
const TOOLTIP_STORAGE_KEY = 'n8n-resourceCenter-tooltipDismissed';
const SIDEBAR_AUTO_EXPANDED_KEY = 'n8n-resourceCenter-sidebarAutoExpanded';

export const useResourceCenterStore = defineStore('resourceCenter', () => {
	const posthogStore = usePostHog();
	const templatesStore = useTemplatesStore();
	const workflowsStore = useWorkflowsStore();
	const readyToRunStore = useReadyToRunStore();
	const telemetry = useTelemetry();
	const router = useRouter();

	const isLoadingTemplates = ref(false);
	const hasTooltipBeenDismissed = ref(localStorage.getItem(TOOLTIP_STORAGE_KEY) === 'true');
	const hasSidebarBeenAutoExpanded = ref(
		localStorage.getItem(SIDEBAR_AUTO_EXPANDED_KEY) === 'true',
	);

	const isFeatureEnabled = () =>
		posthogStore.isVariantEnabled(
			RESOURCE_CENTER_EXPERIMENT.name,
			RESOURCE_CENTER_EXPERIMENT.variant,
		);

	const shouldShowResourceCenterTooltip = computed(() => {
		return isFeatureEnabled() && !hasTooltipBeenDismissed.value;
	});

	function markResourceCenterTooltipDismissed() {
		hasTooltipBeenDismissed.value = true;
		localStorage.setItem(TOOLTIP_STORAGE_KEY, 'true');
	}

	function trackResourceCenterTooltipView() {
		telemetry.track('User viewed resource center tooltip');
	}

	function trackResourceCenterTooltipDismiss() {
		telemetry.track('User dismissed resource center tooltip');
	}

	async function fetchTemplateById(templateId: number): Promise<ITemplatesWorkflowFull | null> {
		try {
			return await templatesStore.fetchTemplateById(templateId.toString());
		} catch (error) {
			console.error(`Failed to fetch template ${templateId}:`, error);
			return null;
		}
	}

	async function loadTemplates(templateIds: number[]): Promise<ITemplatesWorkflowFull[]> {
		isLoadingTemplates.value = true;
		try {
			const promises = templateIds.map(async (id) => await fetchTemplateById(id));
			const results = await Promise.allSettled(promises);
			return results
				.filter(
					(result): result is PromiseFulfilledResult<ITemplatesWorkflowFull> =>
						result.status === 'fulfilled' && result.value !== null,
				)
				.map((result) => result.value);
		} finally {
			isLoadingTemplates.value = false;
		}
	}

	function getTemplateRoute(id: number) {
		return { name: VIEWS.TEMPLATE, params: { id } } as const;
	}

	// Telemetry tracking
	function trackResourceCenterView() {
		telemetry.track('User visited resource center');
	}

	function trackTileClick(section: string, type: string, id: string | number) {
		telemetry.track('User clicked on resource center tile', { section, type, id });
	}

	async function createAndOpenQuickStartWorkflow(quickStartId: string) {
		const quickStart = quickStartWorkflows.find((w) => w.id === quickStartId);
		if (!quickStart) return;

		// Claim OpenAI credits if user can (same logic as readyToRun)
		if (readyToRunStore.userCanClaimOpenAiCredits) {
			await readyToRunStore.claimFreeAiCredits();
		}

		// Create workflow with credential injection
		let workflowToCreate: WorkflowDataCreate = {
			...quickStart.workflow,
			name: quickStart.name,
		};

		// Get claimed credential from localStorage (via readyToRun store)
		const credentialId = localStorage.getItem(LOCAL_STORAGE_CREDENTIAL_KEY);
		if (credentialId && workflowToCreate.nodes) {
			const clonedWorkflow = deepCopy(workflowToCreate);
			const openAiNode = clonedWorkflow.nodes?.find((node) => node.name === 'OpenAI Model');
			if (openAiNode) {
				openAiNode.credentials ??= {};
				openAiNode.credentials[OPEN_AI_API_CREDENTIAL_TYPE] = {
					id: credentialId,
					name: '',
				};
			}
			workflowToCreate = clonedWorkflow;
		}

		const createdWorkflow = await workflowsStore.createNewWorkflow(workflowToCreate);

		await router.push({
			name: VIEWS.WORKFLOW,
			params: { workflowId: createdWorkflow.id },
		});
	}

	const shouldAutoExpandSidebar = computed(() => {
		return isFeatureEnabled() && !hasSidebarBeenAutoExpanded.value;
	});

	function markSidebarAutoExpanded() {
		hasSidebarBeenAutoExpanded.value = true;
		localStorage.setItem(SIDEBAR_AUTO_EXPANDED_KEY, 'true');
	}

	return {
		isFeatureEnabled,
		isLoadingTemplates,
		shouldShowResourceCenterTooltip,
		shouldAutoExpandSidebar,
		fetchTemplateById,
		loadTemplates,
		getTemplateRoute,
		createAndOpenQuickStartWorkflow,
		markResourceCenterTooltipDismissed,
		markSidebarAutoExpanded,
		trackResourceCenterView,
		trackResourceCenterTooltipView,
		trackResourceCenterTooltipDismiss,
		trackTileClick,
	};
});
