import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUsersStore } from '@n8n/stores/users.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { updateCurrentUserSettings } from '@n8n/rest-api-client/api/users';
import { VIEWS } from '@/app/constants';
import {
	getRagStarterWorkflowJson,
	getSampleWorkflowByTemplateId,
	SampleTemplates,
} from '@/features/workflows/templates/utils/workflowSamples';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

export function useCalloutHelpers() {
	const route = useRoute();
	const router = useRouter();
	const telemetry = useTelemetry();

	const rootStore = useRootStore();
	const workflowsStore = useWorkflowsStore();
	const workflowsListStore = useWorkflowsListStore();
	const usersStore = useUsersStore();
	const projectsStore = useProjectsStore();

	const isRagStarterCalloutVisible = computed(() => {
		const template = getRagStarterWorkflowJson();

		const routeTemplateId = route.query.templateId;
		const workflow = workflowsListStore.getWorkflowById(workflowsStore.workflowId);

		// Hide the RAG starter callout if we're currently on the RAG starter template
		if ((routeTemplateId ?? workflow?.meta?.templateId) === template.meta.templateId) {
			return false;
		}

		return true;
	});

	const openSampleWorkflowTemplate = (
		templateId: string,
		options: {
			telemetry: {
				source: 'ndv' | 'nodeCreator' | 'modal';
				nodeType?: string;
			};
		},
	) => {
		if (templateId === SampleTemplates.RagStarterTemplate) {
			telemetry.track('User clicked on RAG callout', {
				node_type: options.telemetry.nodeType ?? null,
			});
		}

		const template = getSampleWorkflowByTemplateId(templateId);
		if (!template) {
			return;
		}

		const { href } = router.resolve({
			name: VIEWS.TEMPLATE_IMPORT,
			params: { id: template.meta.templateId },
			query: {
				fromJson: 'true',
				parentFolderId: route.params.folderId,
				projectId: projectsStore.currentProjectId,
			},
		});

		window.open(href, '_blank');
	};

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
		openSampleWorkflowTemplate,
		isRagStarterCalloutVisible,
		isCalloutDismissed,
		dismissCallout,
	};
}
