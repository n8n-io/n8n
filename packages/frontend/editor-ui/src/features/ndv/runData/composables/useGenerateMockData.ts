import type { IDataObject, INode } from 'n8n-workflow';
import type { MaybeRef } from 'vue';
import { computed, ref, unref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@n8n/stores/settings.store';
import type { Schema } from '@/Interface';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { generateCodeForPrompt } from '@/features/ai/assistant/assistant.api';
import type { AskAiRequest } from '@/features/ai/assistant/assistant.types';
import { getSchemas } from '@/features/ndv/parameters/utils/buttonParameter.utils';
import {
	injectWorkflowDocumentStore,
	type WorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { injectNDVStore } from '@/features/ndv/shared/ndv.store';
import {
	buildGenerateMockDataPrompt,
	isExternalIntegrationNode,
	parseGenerateMockDataResponse,
	resolveGenerateMockDataMode,
	type GenerateMockDataMode,
} from '../generateMockData.utils';

const EMPTY_SCHEMA: Schema = {
	type: 'object',
	value: [],
	path: '',
};

function buildAskAiContext(
	workflowDocumentId: WorkflowDocumentId,
	activeNode: INode | null,
	ndvPushRef: string,
	pushRef: string,
): AskAiRequest.RequestPayload['context'] {
	const schemas = getSchemas(workflowDocumentId, activeNode);
	const inputSchema = schemas.inputSchema ?? {
		nodeName: activeNode?.name ?? 'node',
		schema: EMPTY_SCHEMA,
	};

	return {
		schema: schemas.parentNodesSchemas,
		inputSchema,
		ndvPushRef,
		pushRef,
	};
}

export function useGenerateMockData(node: MaybeRef<INode | null>) {
	const i18n = useI18n();
	const toast = useToast();
	const telemetry = useTelemetry();
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();
	const nodeTypesStore = useNodeTypesStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const ndvStore = injectNDVStore();

	const mode = ref<GenerateMockDataMode>('success');
	const scenarioText = ref('');
	const isGenerating = ref(false);

	const isExternalIntegration = computed(() => {
		const targetNode = unref(node);
		if (!targetNode) return false;

		return isExternalIntegrationNode(
			nodeTypesStore.getNodeType(targetNode.type, targetNode.typeVersion),
		);
	});

	const isGenerateMockDataEnabled = computed(
		() => settingsStore.isAskAiAvailable && isExternalIntegration.value,
	);
	const showScenarioInput = computed(() => mode.value === 'describe');

	async function generate(): Promise<IDataObject[] | null> {
		const targetNode = unref(node);
		if (!targetNode || !workflowDocumentStore.value) {
			return null;
		}

		const resolvedMode = resolveGenerateMockDataMode(mode.value, scenarioText.value);
		const hasScenarioText = scenarioText.value.trim().length > 0;

		telemetry.track('User generated mock data', {
			node_type: targetNode.type,
			mode: resolvedMode,
			selected_mode: mode.value,
			has_scenario_text: hasScenarioText,
			status: 'started',
		});

		try {
			isGenerating.value = true;

			const question = buildGenerateMockDataPrompt({
				mode: resolvedMode,
				scenarioText: scenarioText.value,
				nodeType: targetNode.type,
				nodeName: targetNode.name,
				parameters: targetNode.parameters,
			});

			const payload: AskAiRequest.RequestPayload = {
				question,
				context: buildAskAiContext(
					workflowDocumentStore.value.documentId,
					targetNode,
					ndvStore.value.pushRef,
					rootStore.pushRef,
				),
				// The AI service only accepts 'code' or 'transform'; it rejects anything else with a 400.
				forNode: 'code',
			};

			const { code } = await generateCodeForPrompt(rootStore.restApiContext, payload);
			const items = parseGenerateMockDataResponse(code);

			telemetry.track('User generated mock data', {
				node_type: targetNode.type,
				mode: resolvedMode,
				selected_mode: mode.value,
				has_scenario_text: hasScenarioText,
				status: 'success',
				item_count: items.length,
			});

			return items;
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: i18n.baseText('ndv.generateMockData.error.generic');

			toast.showError(
				error instanceof Error ? error : new Error(message),
				i18n.baseText('ndv.generateMockData.error.title'),
			);

			telemetry.track('User generated mock data', {
				node_type: targetNode.type,
				mode: resolvedMode,
				selected_mode: mode.value,
				has_scenario_text: hasScenarioText,
				status: 'error',
				error_message: message,
			});

			return null;
		} finally {
			isGenerating.value = false;
		}
	}

	return {
		mode,
		scenarioText,
		isGenerating,
		isGenerateMockDataEnabled,
		showScenarioInput,
		generate,
	};
}
