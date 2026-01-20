import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { updateCurrentUserSettings } from '@n8n/rest-api-client/api/users';
import { VIEWS } from '@/app/constants';
import {
	getRagStarterWorkflowJson,
	getSampleWorkflowByTemplateId,
	getTutorialTemplates,
	isTutorialTemplateId,
	SampleTemplates,
} from '@/features/workflows/templates/utils/workflowSamples';
import type { OpenTemplateElement } from '@/Interface';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

export function useCalloutHelpers() {
	const route = useRoute();
	const router = useRouter();
	const telemetry = useTelemetry();

	const rootStore = useRootStore();
	const workflowsStore = useWorkflowsStore();
	const usersStore = useUsersStore();
	const nodeTypesStore = useNodeTypesStore();
	const projectsStore = useProjectsStore();

	const isRagStarterCalloutVisible = computed(() => {
		const template = getRagStarterWorkflowJson();

		const routeTemplateId = route.query.templateId;
		const workflowObject = workflowsStore.workflowObject;
		const workflow = workflowsStore.getWorkflowById(workflowObject.id);

		// Hide the RAG starter callout if we're currently on the RAG starter template
		if ((routeTemplateId ?? workflow?.meta?.templateId) === template.meta.templateId) {
			return false;
		}

		return true;
	});

	const getTutorialTemplatesNodeCreatorItems = (): OpenTemplateElement[] => {
		const templates = getTutorialTemplates();

		return templates.map((template) => {
			return {
				key: template.template.meta.templateId,
				type: 'openTemplate',
				properties: {
					templateId: template.template.meta.templateId,
					title: template.name,
					description: template.description,
					nodes: template.nodes.flatMap((node) => {
						const nodeType = nodeTypesStore.getNodeType(node.name, node.version);
						if (!nodeType) {
							return [];
						}
						return nodeType;
					}),
				},
			};
		});
	};

	const openSampleWorkflowTemplate = (
		templateId: string,
		options: {
			telemetry: {
				source: 'ndv' | 'nodeCreator' | 'modal' | 'templates';
				nodeType?: string;
				section?: string;
			};
		},
	) => {
		if (templateId === SampleTemplates.RagStarterTemplate) {
			telemetry.track('User clicked on RAG callout', {
				node_type: options.telemetry.nodeType ?? null,
			});
		} else if (isTutorialTemplateId(templateId)) {
			telemetry.track('User inserted tutorial template', {
				template: templateId,
				source: options.telemetry.source,
				node_type: options.telemetry.nodeType ?? null,
				section: options.telemetry.section ?? null,
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
		getTutorialTemplatesNodeCreatorItems,
		isRagStarterCalloutVisible,
		isCalloutDismissed,
		dismissCallout,
	};
}
