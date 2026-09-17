import { toEngineConnections, type WorkflowJSON } from '@n8n/workflow-sdk';
import {
	getChildNodes,
	getParentNodes,
	isTriggerNodeType,
	mapConnectionsByDestination,
	NodeConnectionTypes,
} from 'n8n-workflow';

export const AGENT_NODE_TYPE = '@n8n/n8n-nodes-langchain.agent';
export const AGENT_TOOL_NODE_TYPE = '@n8n/n8n-nodes-langchain.agentTool';

export function getTriggerMainFlowScope(
	connections: WorkflowJSON['connections'],
	triggerNodeName: string,
): Set<string> {
	return new Set([
		triggerNodeName,
		...getChildNodes(toEngineConnections(connections), triggerNodeName, NodeConnectionTypes.Main),
	]);
}

/** Keep tool edges separate. They point from the tool to its caller. */
export function createVerificationGraph(workflow: WorkflowJSON) {
	const connections = toEngineConnections(workflow.connections);
	const byDestination = mapConnectionsByDestination(connections);
	const nodesByName = new Map(
		workflow.nodes
			.filter(
				(node): node is WorkflowJSON['nodes'][number] & { name: string } =>
					typeof node.name === 'string' && !node.disabled,
			)
			.map((node) => [node.name, node]),
	);
	// Triggers such as MCP can have tools without any main connections.
	const rootNodeNames = new Set(
		[...nodesByName.values()]
			.filter((node) => isTriggerNodeType(node.type))
			.map((node) => node.name),
	);
	for (const name of Object.keys(connections)) {
		const children = getChildNodes(connections, name, NodeConnectionTypes.Main, 1);
		if (children.length === 0) continue;
		for (const nodeName of [name, ...children]) {
			if (nodesByName.has(nodeName)) rootNodeNames.add(nodeName);
		}
	}
	const toolsFor = (name: string) =>
		getParentNodes(byDestination, name, NodeConnectionTypes.AiTool, 1).filter((toolName) =>
			nodesByName.has(toolName),
		);
	const withTools = (mainScope: ReadonlySet<string>) => {
		const names = new Set<string>();
		const pending = [...mainScope];
		while (pending.length > 0) {
			const name = pending.pop()!;
			if (names.has(name) || !nodesByName.has(name)) continue;
			names.add(name);
			pending.push(...toolsFor(name));
		}
		return names;
	};
	return { nodesByName, rootNodeNames, toolsFor, withTools };
}
