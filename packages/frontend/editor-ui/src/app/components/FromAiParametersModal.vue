<script setup lang="ts">
import Modal from '@/app/components/Modal.vue';
import { useI18n } from '@n8n/i18n';
import { useRunWorkflow } from '@/app/composables/useRunWorkflow';
import { FROM_AI_PARAMETERS_MODAL_KEY, AI_MCP_TOOL_NODE_TYPE } from '@/app/constants';
import { useAgentRequestStore, type IAgentRequest } from '@n8n/stores/useAgentRequestStore';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { createEventBus } from '@n8n/utils/event-bus';
import type { INode, FromAIArgument, IDataObject } from 'n8n-workflow';
import { traverseNodeParameters, NodeConnectionTypes, isHitlToolType } from 'n8n-workflow';
import type { FormFieldValueUpdate, IFormInput } from '@n8n/design-system';
import { computed, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { type JSONSchema7 } from 'json-schema';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

import { ElCol, ElRow } from 'element-plus';
import { N8nButton, N8nCallout, N8nFormInputs, N8nText } from '@n8n/design-system';
import { TOOL_NODE_TYPES_NEED_INPUT } from '../utils/nodes/nodeTransforms';
type Value = string | number | boolean | null | undefined;

type FieldMetadata = {
	nodeName: string;
} & ({ type: 'selector' } | { type: 'query'; propertyName: string });

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
const nodeTypesStore = useNodeTypesStore();
const router = useRouter();
const { runWorkflow } = useRunWorkflow({ router });
const agentRequestStore = useAgentRequestStore();
const projectsStore = useProjectsStore();

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
const selectedToolMap = reactive<Record<string, string | undefined>>({});
const error = ref<Error | undefined>(undefined);

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

const getToolName = (toolNode: INode | string) => {
	const name = typeof toolNode === 'string' ? toolNode : toolNode.name;
	return name.replaceAll(' ', '_');
};

const getToolNamePrefix = (toolNode: INode | string) => {
	return `node_${getToolName(toolNode)}_`;
};
const getToolNameOptionName = (toolNode: INode | string) => {
	return `tool_${getToolName(toolNode)}_option`;
};

const getMCPTools = async (newNode: INode): Promise<IFormInput[]> => {
	const result: Array<IFormInput<FieldMetadata>> = [];

	const tools = await nodeTypesStore.getNodeParameterOptions({
		nodeTypeAndVersion: {
			name: newNode.type,
			version: newNode.typeVersion,
		},
		path: 'parameters.includedTools',
		methodName: 'getTools',
		currentNodeParameters: newNode.parameters,
		credentials: newNode.credentials,
		projectId: projectsStore.currentProjectId,
	});

	// Load available tools
	const toolOptions = tools?.map((tool) => ({
		label: tool.name,
		value: String(tool.value),
		disabled: false,
	}));

	result.push({
		name: getToolNameOptionName(newNode),
		initialValue: '',
		properties: {
			label: 'Tool name',
			type: 'select',
			options: toolOptions,
			required: true,
		},
		metadata: {
			nodeName: newNode.name,
			type: 'selector',
		},
	});

	// Only show parameters for selected tool
	const newSelectedTool = selectedToolMap[newNode.name];
	if (newSelectedTool) {
		const selectedToolData = tools?.find((tool) => String(tool.value) === newSelectedTool);
		const schema = selectedToolData?.inputSchema as JSONSchema7;
		if (schema.properties) {
			for (const [propertyName, value] of Object.entries(schema.properties)) {
				const type =
					typeof value === 'object' && 'type' in value && typeof value.type === 'string'
						? value.type
						: 'text';

				result.push({
					name: `${getToolNamePrefix(newSelectedTool)}query.${propertyName}`,
					initialValue: '',
					properties: {
						label: propertyName,
						type: mapTypes[type].inputType,
						required: true,
					},
					metadata: {
						nodeName: newSelectedTool,
						type: 'query',
						propertyName,
					},
				});
			}
		}
	}

	return result;
};

const getToolParameters = async (
	newNode: INode | null | undefined,
	omitFallbackField = false,
): Promise<{
	parameters: IFormInput[];
	error?: Error;
}> => {
	const result: IFormInput[] = [];
	if (!newNode) {
		return { parameters: result };
	}
	if (isHitlToolType(newNode.type)) {
		const hitlToolParameters = await getHitlToolParameters(newNode);
		return { parameters: hitlToolParameters };
	}

	// Handle MCPClientTool nodes differently
	if (newNode.type === AI_MCP_TOOL_NODE_TYPE) {
		try {
			const mcpResult = await getMCPTools(newNode);

			return { parameters: mcpResult };
		} catch (e: unknown) {
			return {
				parameters: result,
				error: e instanceof Error ? e : new Error('Unknown error occurred'),
			};
		}
	}

	// Handle regular tool nodes
	const regularToolParameters = getRegularToolParameters(newNode, omitFallbackField);
	return { parameters: regularToolParameters };
};

const getHitlToolParameters = async (newNode: INode): Promise<IFormInput[]> => {
	const result: IFormInput[] = [];
	const connectedToolNodeNames = workflowsStore.workflowObject.getParentNodes(
		newNode.name,
		'ALL_NON_MAIN',
		1,
	);
	const connectedTools = connectedToolNodeNames
		.map((nodeName) => workflowsStore.getNodeByName(nodeName))
		.filter((tool): tool is INode => !!tool);

	const ignoredFields = ['tool', 'toolParameters'];

	// Add HITL node parameters
	const regularParameters = getRegularToolParameters(newNode, true)
		.filter((parameter) => !ignoredFields.includes(parameter.name.replace(/^query\./, '')))
		.map((parameter) => ({
			...parameter,
			name: `${getToolName(newNode)}_${parameter.name}`,
		}));

	result.push(...regularParameters);

	// Load available tools
	const toolOptions = connectedTools.map((tool) => ({
		label: tool.name,
		value: tool.name,
		disabled: false,
	}));

	result.push({
		name: getToolNameOptionName(newNode),
		initialValue: '',
		properties: {
			label: 'Tool name',
			type: 'select',
			options: toolOptions,
			required: true,
		},
		metadata: {
			nodeName: newNode.name,
			type: 'selector',
		},
	});

	const newSelectedTool = selectedToolMap[newNode.name];
	if (newSelectedTool) {
		const selectedTool = connectedTools.find((tool) => tool.name === newSelectedTool);
		if (selectedTool) {
			const selectedToolParameters = await getToolParameters(selectedTool, true);
			result.push(
				...selectedToolParameters.parameters.map((param) => ({
					...param,
					name: `${getToolNamePrefix(selectedTool)}${param.name}`,
				})),
			);
		}
	}
	return result;
};

const getRegularToolParameters = (toolNode: INode, omitFallbackField = false) => {
	const result: IFormInput[] = [];
	const params = toolNode.parameters;
	const collectedArgs: FromAIArgument[] = [];
	traverseNodeParameters(params, collectedArgs);
	const inputOverrides =
		nodeRunData.value?.inputOverride?.[NodeConnectionTypes.AiTool]?.[0]?.[0].json;
	const inputQuery = inputOverrides?.query as IDataObject;
	collectedArgs.forEach((value: FromAIArgument) => {
		const type = value.type ?? 'string';
		const initialValue = inputQuery?.[value.key]
			? inputQuery[value.key]
			: (agentRequestStore.getQueryValue(
					workflowsStore.workflowId,
					toolNode.id,
					toolNode.name,
					value.key,
				) ?? mapTypes[type]?.defaultValue);

		result.push({
			name: 'query.' + value.key,
			initialValue: initialValue as string | number | boolean | null | undefined,
			properties: {
				label: value.key,
				type: mapTypes[value.type ?? 'string'].inputType,
				required: true,
			},
			metadata: {
				nodeName: toolNode.name,
				type: 'query',
				propertyName: value.key,
			},
		});
	});

	const hasImplicitInput = checkImplicitInput(toolNode);
	const addFallbackField = result.length === 0 && !omitFallbackField;
	if (addFallbackField || hasImplicitInput) {
		const key = hasImplicitInput ? 'input' : 'query';
		const inputQuery = inputOverrides?.[key];
		const queryValue =
			inputQuery ??
			agentRequestStore.getQueryValue(workflowsStore.workflowId, toolNode.id, toolNode.name, key) ??
			'';

		result.unshift({
			name: hasImplicitInput ? 'query.input' : 'query',
			initialValue: (queryValue as string) ?? '',
			properties: {
				label: 'Query',
				type: 'text',
				required: true,
			},
			metadata: {
				nodeName: toolNode.name,
				type: 'query',
				propertyName: hasImplicitInput ? 'input' : 'query',
			},
		});
	}
	return result;
};

function checkImplicitInput(toolNode: INode) {
	// Check if this is a Vector Store node with 'retrieve-as-tool' operation
	// These nodes always have an implicit 'query' parameter for the query
	const nodeType = nodeTypesStore.getNodeType(toolNode.type, toolNode.typeVersion);
	const aiSubcategories = nodeType?.codex?.subcategories?.AI;
	const isVectorStoreToolNode =
		aiSubcategories?.includes('Vector Stores') && aiSubcategories?.includes('Tools');
	const mode = toolNode.parameters.mode;
	return (
		(isVectorStoreToolNode && mode === 'retrieve-as-tool') ||
		TOOL_NODE_TYPES_NEED_INPUT.includes(toolNode.type)
	);
}

watch(
	[node, selectedToolMap],
	async ([newNode]) => {
		error.value = undefined;
		const result = await getToolParameters(newNode);
		if (result.error) {
			error.value = result.error;
			return;
		}
		parameters.value = result.parameters;
	},
	{ immediate: true },
);

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
		agentRequest.query[inputNode] ??= {};
		agentRequest.query[inputNode][queryKey] = queryValue;
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
		selectedToolMap[metadata.nodeName] = change.value;
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
