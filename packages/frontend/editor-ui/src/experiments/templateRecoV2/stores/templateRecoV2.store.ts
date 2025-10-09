import { useTelemetry } from '@/composables/useTelemetry';
import { TEMPLATE_RECO_V2, VIEWS } from '@/constants';
import { useCloudPlanStore } from '@/stores/cloudPlan.store';
import { usePostHog } from '@/stores/posthog.store';
import { useTemplatesStore } from '@/stores/templates.store';
import { STORES } from '@n8n/stores';
import { defineStore } from 'pinia';
import { computed } from 'vue';
import { NODE_DATA, type PredefinedNodeData } from '../nodes/predefinedData';

const PREDEFINED_NODES = Object.keys(NODE_DATA);

export const usePersonalizedTemplatesV2Store = defineStore(
	STORES.EXPERIMENT_TEMPLATE_RECO_V2,
	() => {
		const telemetry = useTelemetry();
		const posthogStore = usePostHog();
		const cloudPlanStore = useCloudPlanStore();
		const templatesStore = useTemplatesStore();

		const isFeatureEnabled = () => {
			return (
				posthogStore.getVariant(TEMPLATE_RECO_V2.name) === TEMPLATE_RECO_V2.variant &&
				cloudPlanStore.userIsTrialing
			);
		};

		function getNodeData(nodeId: string): PredefinedNodeData {
			if (nodeId in NODE_DATA) {
				return NODE_DATA[nodeId];
			}

			return {
				starter: [],
				popular: [],
				youtube: [],
			};
		}

		async function getTemplateData(templateId: number) {
			return await templatesStore.fetchTemplateById(templateId.toString());
		}

		function getTemplateRoute(id: number) {
			return { name: VIEWS.TEMPLATE, params: { id } };
		}

		const nodes = computed(() => {
			const selectedApps = cloudPlanStore.selectedApps;

			if (!selectedApps?.length) {
				return [];
			}

			return PREDEFINED_NODES.filter((nodeName) => selectedApps.includes(nodeName)).slice(0, 3);
		});

		function trackMinicardClick(tool: string) {
			telemetry.track('User clicked on node minicard', {
				tool,
			});
		}

		function trackModalTabView(tool: string) {
			telemetry.track('User visited template recommendation modal tab', {
				tool,
			});
		}

		function trackTemplateTileClick(templateId: number) {
			telemetry.track('User clicked on template recommendation tile', {
				templateId,
			});
		}

		function trackVideoClick(name: string) {
			telemetry.track('User clicked on template recommendation video', {
				name,
			});
		}

		function trackSeeMoreClick(type: 'starter' | 'popular') {
			telemetry.track('User clicked on template recommendation see more', {
				type,
			});
		}

		return {
			isFeatureEnabled,
			getNodeData,
			getTemplateData,
			nodes,
			getTemplateRoute,
			trackMinicardClick,
			trackModalTabView,
			trackTemplateTileClick,
			trackVideoClick,
			trackSeeMoreClick,
		};
	},
);
