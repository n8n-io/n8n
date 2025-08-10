import { computed, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTelemetry } from '@/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useI18n } from '@n8n/i18n';
import { useUsersStore } from '@/stores/users.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { usePostHog } from '@/stores/posthog.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeCreatorStore } from '@/stores/nodeCreator.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useViewStacks } from '@/components/Node/NodeCreator/composables/useViewStacks';
import { updateCurrentUserSettings } from '@n8n/rest-api-client/api/users';
import {
	NODE_CREATOR_OPEN_SOURCES,
	PRE_BUILT_AGENTS_EXPERIMENT,
	REGULAR_NODE_CREATOR_VIEW,
	VIEWS,
} from '@/constants';
import {
	getPrebuiltAgents,
	getRagStarterWorkflowJson,
	getSampleWorkflowByTemplateId,
	isPrebuiltAgentTemplateId,
	SampleTemplates,
} from '@/utils/templates/workflowSamples';
import type { INodeCreateElement, OpenTemplateElement } from '@/Interface';

export function useCalloutHelpers() {
	const route = useRoute();
	const router = useRouter();
	const telemetry = useTelemetry();
	const postHog = usePostHog();
	const rootStore = useRootStore();
	const workflowsStore = useWorkflowsStore();
	const usersStore = useUsersStore();
	const ndvStore = useNDVStore();
	const nodeCreatorStore = useNodeCreatorStore();
	const viewStacks = useViewStacks();
	const nodeTypesStore = useNodeTypesStore();
	const i18n = useI18n();

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

	const getPreBuiltAgentNodeCreatorItems = (): OpenTemplateElement[] => {
		const templates = getPrebuiltAgents();
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

	const openPreBuiltAgentsCollection = async (options: {
		telemetry: {
			source: 'ndv' | 'nodeCreator';
			nodeType?: string;
			section?: string;
		};
		resetStacks?: boolean;
	}) => {
		telemetry.track('User opened pre-built Agents collection', {
			source: options.telemetry.source,
			node_type: options.telemetry.nodeType ?? null,
			section: options.telemetry.section ?? null,
		});

		const items: INodeCreateElement[] = getPreBuiltAgentNodeCreatorItems();

		ndvStore.setActiveNodeName(null);
		nodeCreatorStore.setNodeCreatorState({
			source: NODE_CREATOR_OPEN_SOURCES.TEMPLATES_CALLOUT,
			createNodeActive: true,
			nodeCreatorView: undefined,
			connectionType: undefined,
		});

		await nextTick();

		viewStacks.pushViewStack(
			{
				title: i18n.baseText('nodeCreator.preBuiltAgents.title'),
				rootView: REGULAR_NODE_CREATOR_VIEW,
				activeIndex: 0,
				transitionDirection: 'in',
				hasSearch: false,
				preventBack: false,
				items,
				baselineItems: items,
				mode: 'nodes',
				hideActions: false,
			},
			{ resetStacks: options.resetStacks ?? false },
		);
	};

	const openSampleWorkflowTemplate = (
		templateId: string,
		options: {
			telemetry: {
				source: 'ndv' | 'nodeCreator';
				nodeType?: string;
				section?: string;
			};
		},
	) => {
		if (templateId === SampleTemplates.RagStarterTemplate) {
			telemetry.track('User clicked on RAG callout', {
				node_type: options.telemetry.nodeType ?? null,
			});
		} else if (isPrebuiltAgentTemplateId(templateId)) {
			telemetry.track('User inserted pre-built Agent', {
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
			query: { fromJson: 'true', parentFolderId: route.params.folderId },
		});

		window.open(href, '_blank');
	};

	const isPreBuiltAgentsExperimentEnabled = computed(() => {
		return postHog.isVariantEnabled(
			PRE_BUILT_AGENTS_EXPERIMENT.name,
			PRE_BUILT_AGENTS_EXPERIMENT.variant,
		);
	});

	const isPreBuiltAgentsCalloutVisible = computed(() => {
		return isPreBuiltAgentsExperimentEnabled.value;
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
		openSampleWorkflowTemplate,
		openPreBuiltAgentsCollection,
		getPreBuiltAgentNodeCreatorItems,
		isRagStarterCalloutVisible,
		isPreBuiltAgentsCalloutVisible,
		isCalloutDismissed,
		dismissCallout,
	};
}
