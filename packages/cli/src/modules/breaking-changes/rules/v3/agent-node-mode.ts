import type { INode } from 'n8n-workflow';

export const AGENT_NODE_TYPE = '@n8n/n8n-nodes-langchain.agent';
const FIRST_SUPPORTED_VERSION = 2;

/** Agent modes that only versions below 2 offered, mapped to their display name. */
const REMOVED_AGENT_MODES: Record<string, string> = {
	conversationalAgent: 'Conversational Agent',
	openAiFunctionsAgent: 'OpenAI Functions Agent',
	planAndExecuteAgent: 'Plan and Execute Agent',
	reActAgent: 'ReAct Agent',
	sqlAgent: 'SQL Agent',
};

/**
 * Up to version 1.5 the `agent` parameter defaulted to the Conversational Agent, so an unset
 * parameter means Tools Agent only from 1.6 onwards.
 */
function resolveAgentMode(node: INode) {
	if (typeof node.parameters?.agent === 'string') return node.parameters.agent;

	return node.typeVersion <= 1.5 ? 'conversationalAgent' : 'toolsAgent';
}

export function getAgentNodesBelowFirstSupportedVersion(
	nodesGroupedByType: Map<string, INode[]>,
): INode[] {
	return (nodesGroupedByType.get(AGENT_NODE_TYPE) ?? []).filter(
		(node) => node.typeVersion < FIRST_SUPPORTED_VERSION,
	);
}

/** Display name of the removed mode the node runs in, or `undefined` if its mode still exists. */
export function getRemovedAgentMode(node: INode): string | undefined {
	return REMOVED_AGENT_MODES[resolveAgentMode(node)];
}
