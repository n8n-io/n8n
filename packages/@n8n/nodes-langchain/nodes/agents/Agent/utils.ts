// Function used in the inputs expression to figure out which inputs to

import {
	NodeOperationError,
	type IExecuteFunctions,
	type INode,
	type INodeInputConfiguration,
	type INodeFilter,
	type NodeConnectionType,
} from 'n8n-workflow';

// display based on the agent type
/* istanbul ignore next */
export function getInputs(
	hasMainInput?: boolean,
	hasOutputParser?: boolean,
	needsFallback?: boolean,
): Array<NodeConnectionType | INodeInputConfiguration> {
	interface SpecialInput {
		type: NodeConnectionType;
		filter?: INodeFilter;
		displayName: string;
		required?: boolean;
	}

	const getInputData = (
		inputs: SpecialInput[],
	): Array<NodeConnectionType | INodeInputConfiguration> => {
		return inputs.map(({ type, filter, displayName, required }) => {
			const input: INodeInputConfiguration = {
				type,
				displayName,
				required,
				maxConnections: ['ai_languageModel', 'ai_memory', 'ai_outputParser'].includes(type)
					? 1
					: undefined,
			};

			if (filter) {
				input.filter = filter;
			}

			return input;
		});
	};

	let specialInputs: SpecialInput[] = [
		{
			type: 'ai_languageModel',
			displayName: 'Chat Model',
			required: true,
			filter: {
				excludedNodes: [
					'@n8n/n8n-nodes-langchain.lmCohere',
					'@n8n/n8n-nodes-langchain.lmOllama',
					'@n8n/n8n-nodes-langchain.lmOpenHuggingFaceInference',
				],
			},
		},
		{
			type: 'ai_languageModel',
			displayName: 'Fallback Model',
			required: true,
			filter: {
				excludedNodes: [
					'@n8n/n8n-nodes-langchain.lmCohere',
					'@n8n/n8n-nodes-langchain.lmOllama',
					'@n8n/n8n-nodes-langchain.lmOpenHuggingFaceInference',
				],
			},
		},
		{
			displayName: 'Memory',
			type: 'ai_memory',
		},
		{
			displayName: 'Tool',
			type: 'ai_tool',
		},
		{
			displayName: 'Output Parser',
			type: 'ai_outputParser',
		},
	];

	if (hasOutputParser === false) {
		specialInputs = specialInputs.filter((input) => input.type !== 'ai_outputParser');
	}
	if (needsFallback === false) {
		specialInputs = specialInputs.filter((input) => input.displayName !== 'Fallback Model');
	}

	// Note cannot use NodeConnectionType.Main
	// otherwise expression won't evaluate correctly on the FE
	const mainInputs = hasMainInput ? ['main' as NodeConnectionType] : [];
	return [...mainInputs, ...getInputData(specialInputs)];
}

/** Agent modes that only versions 1 to 1.9 offered and that are no longer available. */
const UNSUPPORTED_AGENT_MODES: Record<string, string> = {
	conversationalAgent: 'Conversational Agent',
	openAiFunctionsAgent: 'OpenAI Functions Agent',
	planAndExecuteAgent: 'Plan and Execute Agent',
	reActAgent: 'ReAct Agent',
	sqlAgent: 'SQL Agent',
};

/**
 * Versions 1 to 1.9 stored the selected agent mode in the `agent` parameter. Up to 1.5 the
 * parameter defaulted to the Conversational Agent, so an unset parameter means Tools Agent
 * only from 1.6 onwards.
 */
function resolveAgentMode(node: INode) {
	if (typeof node.parameters?.agent === 'string') return node.parameters.agent;

	return node.typeVersion <= 1.5 ? 'conversationalAgent' : 'toolsAgent';
}

/**
 * Only the Tools Agent is still available, so stop any other mode before it reaches the
 * Tools Agent executor.
 */
export function assertToolsAgentMode(ctx: IExecuteFunctions) {
	const node = ctx.getNode();
	const displayName = UNSUPPORTED_AGENT_MODES[resolveAgentMode(node)];

	if (!displayName) return;

	throw new NodeOperationError(node, `The "${displayName}" mode is no longer available`, {
		description:
			'Replace this node with an AI Agent on the latest version and connect the tools it needs.',
	});
}
