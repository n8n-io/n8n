<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { useRunWorkflow } from '@/composables/useRunWorkflow';
import { FROM_AI_PARAMETERS_MODAL_KEY, AI_MCP_TOOL_NODE_TYPE } from '@/constants';
import { useAgentRequestStore, type IAgentRequest } from '@n8n/stores/useAgentRequestStore';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { createEventBus } from '@n8n/utils/event-bus';
import {
	type FromAIArgument,
	type IDataObject,
	NodeConnectionTypes,
	traverseNodeParameters,
} from 'n8n-workflow';
import type { FormFieldValueUpdate, IFormInput } from '@n8n/design-system';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useTelemetry } from '@/composables/useTelemetry';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { type JSONSchema7 } from 'json-schema';

type Value = string | number | boolean | null | undefined;

const props = defineProps<{
	modalName: string;
	data: {
		nodeName: string | undefined;
	};
}>();

const inputs = ref<{ getValues: () => Record<string, Value> }>();
const i18n = useI18n();
const telemetry = useTelemetry();
const ndvStore = useNDVStore();
const modalBus = createEventBus();
const workflowsStore = useWorkflowsStore();
const nodeTypesStore = useNodeTypesStore();
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

const parameters = ref<IFormInput[]>([]);
const selectedTool = ref<string>('');

const nodeRunData = computed(() => {
	if (!node.value) return undefined;

	const workflowExecutionData = workflowsStore.getWorkflowExecution;
	const lastRunData = workflowExecutionData?.data?.resultData.runData[node.value?.name];
	if (!lastRunData) return undefined;
	return lastRunData[0];
});

const mapTypes: {
	[key: string]: {
		inputType: 'text' | 'number' | 'checkbox';
		defaultValue: string | number | boolean | null | undefined;
	};
} = {
	['string']: {
		inputType: 'text',
		defaultValue: '',
	},
	['boolean']: {
		inputType: 'checkbox',
		defaultValue: true,
	},
	['number']: {
		inputType: 'number',
		defaultValue: 0,
	},
	['json']: {
		inputType: 'text',
		defaultValue: '',
	},
};

watch(
	[node, selectedTool],
	async ([newNode, newSelectedTool]) => {
		if (!newNode) {
			parameters.value = [];
			return;
		}

		const result: IFormInput[] = [];

		// Handle MCPClientTool nodes differently
		if (newNode.type === AI_MCP_TOOL_NODE_TYPE) {
			const tools = await nodeTypesStore.getNodeParameterOptions({
				nodeTypeAndVersion: {
					name: newNode.type,
					version: newNode.typeVersion,
				},
				path: 'parmeters.includedTools',
				methodName: 'getTools',
				currentNodeParameters: newNode.parameters,
			});

			// Load available tools
			const toolOptions = tools?.map((tool) => ({
				label: tool.name,
				value: String(tool.value),
				disabled: false,
			}));

			result.push({
				name: 'toolName',
				initialValue: '',
				properties: {
					label: 'Tool name',
					type: 'select',
					options: toolOptions,
					required: true,
				},
			});

			// Only show parameters for selected tool
			if (newSelectedTool) {
				const selectedToolData = tools?.find((tool) => String(tool.value) === newSelectedTool);
				const schema = selectedToolData?.inputSchema as JSONSchema7;
				if (schema.properties) {
					for (const [propertyName, value] of Object.entries(schema.properties)) {
						const typedValue = value as {
							type: string;
							description: string;
						};

						result.push({
							name: 'query.' + propertyName,
							initialValue: '',
							properties: {
								label: propertyName,
								type: mapTypes[typedValue.type ?? 'text'].inputType,
								required: true,
							},
						});
					}
				}
			}

			parameters.value = result;
		}

		// Handle regular tool nodes
		const params = newNode.parameters;
		const collectedArgs: FromAIArgument[] = [];
		traverseNodeParameters(params, collectedArgs);
		const inputOverrides =
			nodeRunData.value?.inputOverride?.[NodeConnectionTypes.AiTool]?.[0]?.[0].json;

		collectedArgs.forEach((value: FromAIArgument) => {
			const type = value.type ?? 'string';
			const inputQuery = inputOverrides?.query as IDataObject;
			const initialValue = inputQuery?.[value.key]
				? inputQuery[value.key]
				: (agentRequestStore.getQueryValue(workflowsStore.workflowId, newNode.id, value.key) ??
					mapTypes[type]?.defaultValue);

			result.push({
				name: 'query.' + value.key,
				initialValue: initialValue as string | number | boolean | null | undefined,
				properties: {
					label: value.key,
					type: mapTypes[value.type ?? 'string'].inputType,
					required: true,
				},
			});
		});
		if (result.length === 0) {
			let inputQuery = inputOverrides?.query;
			if (typeof inputQuery === 'object') {
				inputQuery = JSON.stringify(inputQuery);
			}
			const queryValue =
				inputQuery ??
				agentRequestStore.getQueryValue(workflowsStore.workflowId, newNode.id, 'query') ??
				'';

			result.push({
				name: 'query',
				initialValue: (queryValue as string) ?? '',
				properties: {
					label: 'Query',
					type: 'text',
					required: true,
				},
			});
		}
		parameters.value = result;
	},
	{ immediate: true },
);

const onClose = () => {
	modalBus.emit('close');
};

const onExecute = async () => {
	if (!node.value) return;
	const inputValues = inputs.value?.getValues() ?? {};

	agentRequestStore.clearAgentRequests(workflowsStore.workflowId, node.value.id);

	// Structure the input values as IAgentRequest
	const agentRequest: IAgentRequest = {
		query: {},
		toolName: inputValues.toolName as string,
	};

	// Move all query.* fields to query object
	Object.entries(inputValues).forEach(([key, value]) => {
		if (key === 'query') {
			agentRequest.query = value as string;
		} else if (key.startsWith('query.') && 'string' !== typeof agentRequest.query) {
			const queryKey = key.replace('query.', '');
			agentRequest.query[queryKey] = value;
		}
	});

	agentRequestStore.setAgentRequestForNode(workflowsStore.workflowId, node.value.id, agentRequest);

	const telemetryPayload = {
		node_type: node.value.type,
		workflow_id: workflowsStore.workflowId,
		source: 'from-ai-parameters-modal',
		push_ref: ndvStore.pushRef,
	};

	telemetry.track('User clicked execute node button in modal', telemetryPayload);

	await runWorkflow({
		destinationNode: node.value.name,
	});

	onClose();
};

// Add handler for tool selection change
const onUpdate = (change: FormFieldValueUpdate) => {
	if (change.name !== 'toolName') return;
	if (typeof change.value === 'string') {
		selectedTool.value = change.value;
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
		<template #content>
			<el-col>
				<el-row :class="$style.row">
					<n8n-text data-testid="from-ai-parameters-modal-description">
						{{
							i18n.baseText('fromAiParametersModal.description', {
								interpolate: { parentNodeName: parentNode || '' },
							})
						}}
					</n8n-text>
				</el-row>
			</el-col>
			<el-col>
				<el-row :class="$style.row">
					<N8nFormInputs
						ref="inputs"
						:inputs="parameters"
						:column-view="true"
						data-test-id="from-ai-parameters-modal-inputs"
						@submit="onExecute"
						@update="onUpdate"
					></N8nFormInputs>
				</el-row>
			</el-col>
		</template>
		<template #footer>
			<el-row justify="end">
				<el-col :span="5" :offset="19">
					<n8n-button
						data-test-id="execute-workflow-button"
						icon="flask-conical"
						:label="i18n.baseText('fromAiParametersModal.execute')"
						@click="onExecute"
					/>
				</el-col>
			</el-row>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.row {
	margin-bottom: 10px;
}
</style>
