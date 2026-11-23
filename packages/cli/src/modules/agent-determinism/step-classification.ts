import { GEN_AI_ATTR } from '@n8n/ai-utilities/gen-ai';
import {
	AGENT_LANGCHAIN_NODE_TYPE,
	NodeConnectionTypes,
	getChildNodes,
	type IConnections,
	type INode,
	type IRunData,
	type ITaskData,
} from 'n8n-workflow';

import type { StepCounts } from './agent-determinism.contracts';

type WorkflowShape = { nodes: INode[]; connections: IConnections };

function isLlmDecided(node: INode | undefined, task: ITaskData, connections: IConnections) {
	if (!node) return false;
	if (node.type === AGENT_LANGCHAIN_NODE_TYPE) return true;
	if (task.metadata?.tracing?.[GEN_AI_ATTR.OPERATION_NAME] === 'chat') return true;
	return getChildNodes(connections, node.name, NodeConnectionTypes.AiTool, 1).length > 0;
}

export function classifyRunDataSteps(runData: IRunData, workflow: WorkflowShape): StepCounts {
	const nodesByName = new Map(workflow.nodes.map((node) => [node.name, node]));
	const counts: StepCounts = { llmDecided: 0, codeDecided: 0 };
	for (const [nodeName, tasks] of Object.entries(runData)) {
		for (const task of tasks) {
			if (isLlmDecided(nodesByName.get(nodeName), task, workflow.connections)) counts.llmDecided++;
			else counts.codeDecided++;
		}
	}
	return counts;
}

export function sumRunDataTokens(runData: IRunData): number | null {
	let total = 0;
	let found = false;
	for (const task of Object.values(runData).flat()) {
		const tracing = task.metadata?.tracing;
		for (const key of [GEN_AI_ATTR.USAGE_INPUT_TOKENS, GEN_AI_ATTR.USAGE_OUTPUT_TOKENS]) {
			const value = tracing?.[key];
			if (typeof value === 'number') {
				total += value;
				found = true;
			}
		}
	}
	return found ? total : null;
}
