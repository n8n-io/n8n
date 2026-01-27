<script setup lang="ts">
import Modal from '@/app/components/Modal.vue';
import { useRunWorkflow } from '@/app/composables/useRunWorkflow';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { FROM_AI_PARAMETERS_MODAL_KEY } from '@/app/constants';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import type { FormFieldValueUpdate } from '@n8n/design-system';
import { N8nButton, N8nCallout, N8nFormInputs, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useAgentRequestStore, type IAgentRequest } from '@n8n/stores/useAgentRequestStore';
import { createEventBus } from '@n8n/utils/event-bus';
import { ElCol, ElRow } from 'element-plus';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToolParameters } from '../composables/useToolParameters';

type Value = string | number | boolean | null | undefined;

type FieldMetadata = {
	nodeName: string;
} & ({ type: 'selector' } | { type: 'query'; propertyName: string; implicitInput?: boolean });

const props = defineProps<{
	modalName: string;
	data: {
		nodeName: string | undefined;
	};
}>();

const inputs = ref<{
	getValues: () => Record<string, Value>;
	getValuesWithMetadata: () => Record<string, { value: Value; metadata: FieldMetadata }>;
}>();
const i18n = useI18n();
const telemetry = useTelemetry();
const ndvStore = useNDVStore();
const modalBus = createEventBus();
const workflowsStore = useWorkflowsStore();
const router = useRouter();
const { runWorkflow } = useRunWorkflow({ router });
const agentRequestStore = useAgentRequestStore();

const node = computed(() =>
	props.data.nodeName ? workflowsStore.getNodeByName(props.data.nodeName) : undefined,
);

const parentNode = computed(() => {
	if (!node.value) return undefined;
	const parentNodes = workflowsStore.workflowObject.getChildNodes(node.value.name, 'ALL', 1);
	if (parentNodes.length === 0) return undefined;
	return workflowsStore.getNodeByName(parentNodes[0])?.name;
});

const { getToolName, parameters, error, updateSelectedTool } = useToolParameters({ node });

const onClose = () => {
	modalBus.emit('close');
};

const onExecute = async () => {
	if (!node.value) return;
	const nodeName = node.value.name;
	const inputValues = Object.values(inputs.value?.getValuesWithMetadata() ?? {});

	agentRequestStore.clearAgentRequests(workflowsStore.workflowId, node.value.id);
	// check if there's a selected tool, e.g. HITL/MCP client tool selector
	// findLast is used to get the last selected tool from the tool chain
	const selectedToolName = inputValues.findLast((value) => value.metadata?.type === 'selector')
		?.value as string | undefined;

	const agentRequest: IAgentRequest = {
		query: {},
		toolName: selectedToolName ? getToolName(selectedToolName) : getToolName(nodeName),
	};

	for (const input of inputValues) {
		if (input.metadata?.type !== 'query') {
			continue;
		}
		const inputNode = getToolName(input.metadata.nodeName);
		const queryKey = input.metadata.propertyName;
		const queryValue = input.value;
		if (input.metadata.implicitInput) {
			agentRequest.query[inputNode] = queryValue as string;
		} else {
			agentRequest.query[inputNode] ??= {};
			(agentRequest.query[inputNode] as Record<string, unknown>)[queryKey] = queryValue as string;
		}
	}

	agentRequestStore.setAgentRequestForNode(workflowsStore.workflowId, node.value.id, agentRequest);

	const telemetryPayload = {
		node_type: node.value.type,
		workflow_id: workflowsStore.workflowId,
		source: 'from-ai-parameters-modal',
		push_ref: ndvStore.pushRef,
	};

	telemetry.track('User clicked execute node button in modal', telemetryPayload);

	await runWorkflow({
		destinationNode: { nodeName: node.value.name, mode: 'inclusive' },
	});

	onClose();
};

// Add handler for tool selection change
const onUpdate = (change: FormFieldValueUpdate) => {
	const metadata = change.metadata as FieldMetadata | undefined;
	if (metadata?.type !== 'selector') return;
	if (typeof change.value === 'string') {
		updateSelectedTool(metadata.nodeName, change.value);
	}
};
</script>

<template>
	<Modal
		max-width="540px"
		:title="
			i18n.baseText('fromAiParametersModal.title', { interpolate: { nodeName: node?.name || '' } })
		"
		:event-bus="modalBus"
		:name="FROM_AI_PARAMETERS_MODAL_KEY"
		:center="true"
		:close-on-click-modal="false"
	>
		<template v-if="error" #content>
			<N8nCallout v-if="error" theme="danger">
				{{ error.message }}
			</N8nCallout>
		</template>
		<template v-else #content>
			<ElCol>
				<ElRow :class="$style.row">
					<N8nText data-testid="from-ai-parameters-modal-description">
						{{
							i18n.baseText('fromAiParametersModal.description', {
								interpolate: { parentNodeName: parentNode || '' },
							})
						}}
					</N8nText>
				</ElRow>
			</ElCol>
			<ElCol>
				<ElRow :class="$style.row">
					<N8nFormInputs
						v-if="parameters.length"
						ref="inputs"
						:inputs="parameters"
						:column-view="true"
						data-test-id="from-ai-parameters-modal-inputs"
						@submit="onExecute"
						@update="onUpdate"
					></N8nFormInputs>
				</ElRow>
			</ElCol>
		</template>
		<template v-if="!error" #footer>
			<N8nButton
				data-test-id="execute-workflow-button"
				icon="flask-conical"
				:label="i18n.baseText('fromAiParametersModal.execute')"
				float="right"
				@click="onExecute"
			/>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.row {
	margin-bottom: 10px;
}
</style>
