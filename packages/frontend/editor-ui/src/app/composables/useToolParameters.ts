import {
	type FromAIArgument,
	type IDataObject,
	type INode,
	isHitlToolType,
	NodeConnectionTypes,
	traverseNodeParameters,
} from 'n8n-workflow';
import { computed, reactive, ref, watch, type Ref } from 'vue';
import { useWorkflowsStore } from '../stores/workflows.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useNodeTypesStore } from '../stores/nodeTypes.store';
import { useAgentRequestStore } from '@n8n/stores/useAgentRequestStore';
import { type IFormInput } from '@n8n/design-system';
import { type JSONSchema7 } from 'json-schema';
import { AI_MCP_TOOL_NODE_TYPE } from '../constants';
import { TOOL_NODE_TYPES_NEED_INPUT } from '../utils/nodes/nodeTransforms';

export type FieldMetadata = {
	nodeName: string;
} & ({ type: 'selector' } | { type: 'query'; propertyName: string; implicitInput?: boolean });

interface GetToolParametersProps {
	node: Ref<INode | undefined | null>;
}

export function useToolParameters({ node }: GetToolParametersProps) {
	const parameters = ref<IFormInput[]>([]);
	const workflowsStore = useWorkflowsStore();
	const projectsStore = useProjectsStore();
	const nodeTypesStore = useNodeTypesStore();
	const agentRequestStore = useAgentRequestStore();

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
			const schema = selectedToolData?.inputSchema as JSONSchema7 | undefined;
			if (schema?.properties) {
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
			const mcpResult = await getMCPTools(newNode);
			return { parameters: mcpResult };
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
				agentRequestStore.getQueryValue(
					workflowsStore.workflowId,
					toolNode.id,
					toolNode.name,
					key,
				) ??
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
					implicitInput: hasImplicitInput,
				},
			});
		}
		return result;
	};

	const updateSelectedTool = (nodeName: string, value: string) => {
		selectedToolMap[nodeName] = value;
	};

	watch(
		[node, selectedToolMap],
		async ([newNode]) => {
			error.value = undefined;
			try {
				const result = await getToolParameters(newNode);
				parameters.value = result.parameters;
			} catch (e: unknown) {
				error.value = e instanceof Error ? e : new Error('Unknown error occurred');
				return;
			}
		},
		{ immediate: true },
	);

	return { getToolName, parameters, error, updateSelectedTool };
}
