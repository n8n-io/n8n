import { computed } from 'vue';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { VIEWS } from '@/app/constants';
import { useTemplatesStore } from '@/features/workflows/templates/templates.store';
import { STORES } from '@n8n/stores';
import { defineStore } from 'pinia';
import { NODE_DATA, type PredefinedNodeData } from '../nodes/predefinedData';

const PREDEFINED_NODES = Object.keys(NODE_DATA);

export const usePersonalizedTemplatesV2Store = defineStore(
	STORES.EXPERIMENT_TEMPLATE_RECO_V2,
	() => {
		const telemetry = useTelemetry();
		const templatesStore = useTemplatesStore();

		const isFeatureEnabled = () => {
			return true; // Experimental feature enabled by default
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
			return [];
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
