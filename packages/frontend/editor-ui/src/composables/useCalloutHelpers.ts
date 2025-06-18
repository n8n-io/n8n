import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTelemetry } from '@/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import { usePostHog } from '@/stores/posthog.store';
import { useUsersStore } from '@/stores/users.store';
import { RAG_STARTER_WORKFLOW_EXPERIMENT, VIEWS } from '@/constants';
import { getRagStarterWorkflowJson } from '@/utils/easyAiWorkflowUtils';
import { updateCurrentUserSettings } from '@/api/users';
import { useWorkflowsStore } from '@/stores/workflows.store';

export function useCalloutHelpers() {
	const route = useRoute();
	const router = useRouter();
	const telemetry = useTelemetry();
	const posthogStore = usePostHog();
	const rootStore = useRootStore();
	const workflowsStore = useWorkflowsStore();
	const usersStore = useUsersStore();

	const openRagStarterTemplate = async (nodeType?: string) => {
		telemetry.track('User clicked on RAG callout', {
			node_type: nodeType ?? null,
		});

		const template = getRagStarterWorkflowJson();

		const { href } = router.resolve({
			name: VIEWS.TEMPLATE_IMPORT,
			params: { id: template.meta.templateId },
			query: { fromJson: 'true', parentFolderId: route.params.folderId },
		});

		window.open(href, '_blank');
	};

	const isRagStarterWorkflowExperimentEnabled = computed(() => {
		return (
			posthogStore.getVariant(RAG_STARTER_WORKFLOW_EXPERIMENT.name) ===
			RAG_STARTER_WORKFLOW_EXPERIMENT.variant
		);
	});

	const isRagStarterCalloutVisible = computed(() => {
		const template = getRagStarterWorkflowJson();

		const routeTemplateId = route.query.templateId;
		const currentWorkflow = workflowsStore.getCurrentWorkflow();
		const workflow = workflowsStore.getWorkflowById(currentWorkflow.id);

		// Hide the RAG starter callout if we're currently on the RAG starter template
		if ((routeTemplateId ?? workflow?.meta?.templateId) === template.meta.templateId) {
			return false;
		}

		return isRagStarterWorkflowExperimentEnabled.value;
	});

	const isCalloutDismissed = (callout: string) => {
		return usersStore.isCalloutDismissed(callout);
	};

	const dismissCallout = async (callout: string) => {
		usersStore.setCalloutDismissed(callout);

		await updateCurrentUserSettings(rootStore.restApiContext, {
			dismissedCallouts: {
				...usersStore.currentUser?.settings?.dismissedCallouts,
				[callout]: true,
			},
		});
	};

	return {
		openRagStarterTemplate,
		isRagStarterWorkflowExperimentEnabled,
		isRagStarterCalloutVisible,
		isCalloutDismissed,
		dismissCallout,
	};
}
