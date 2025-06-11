import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { INodeTypeDescription } from 'n8n-workflow';
import { useTelemetry } from '@/composables/useTelemetry';
import { usePostHog } from '@/stores/posthog.store';
import { useUsersStore } from '@/stores/users.store';
import { RAG_STARTER_WORKFLOW_EXPERIMENT, VIEWS } from '@/constants';
import { getRagStarterWorkflowJson } from '@/utils/easyAiWorkflowUtils';

export function useCalloutHelpers() {
	const route = useRoute();
	const router = useRouter();
	const telemetry = useTelemetry();
	const posthogStore = usePostHog();
	const usersStore = useUsersStore();

	const openRagStarterTemplate = async (nodeType?: INodeTypeDescription) => {
		telemetry.track('User clicked on RAG callout', {
			node_type: nodeType?.name ?? 'unknown',
		});

		const template = getRagStarterWorkflowJson();

		const { href } = router.resolve({
			name: VIEWS.TEMPLATE_IMPORT,
			params: { id: template.meta.templateId },
			query: { fromJson: 'true', parentFolderId: route.params.folderId },
		});

		window.open(href, '_blank');
	};

	const shouldShowRagStarterCallout = computed(() => {
		const isRagStarterWorkflowExperimentEnabled =
			posthogStore.getVariant(RAG_STARTER_WORKFLOW_EXPERIMENT.name) ===
			RAG_STARTER_WORKFLOW_EXPERIMENT.variant;

		return isRagStarterWorkflowExperimentEnabled && !usersStore.isRagStarterCalloutDismissed;
	});

	return {
		openRagStarterTemplate,
		shouldShowRagStarterCallout,
	};
}
