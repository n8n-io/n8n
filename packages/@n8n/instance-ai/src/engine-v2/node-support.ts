import {
	CHAT_TRIGGER_NODE_TYPE,
	CODE_NODE_TYPE,
	EXECUTE_WORKFLOW_NODE_TYPE,
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	FORM_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	MCP_TRIGGER_NODE_TYPE,
	MICROSOFT_AGENT365_TRIGGER_NODE_TYPE,
	WAIT_NODE_TYPE,
} from 'n8n-workflow';

/**
 * Node types engine v2 cannot run even though they only use main connections.
 * Mirrors the stubs in the engine-v2 module's additional data (task runner,
 * sub-workflows, agents) and the triggers its webhook path refuses.
 */
export const ENGINE_V2_UNSUPPORTED_NODE_TYPES: ReadonlySet<string> = new Set([
	CODE_NODE_TYPE,
	'@n8n/n8n-nodes-langchain.code',
	EXECUTE_WORKFLOW_NODE_TYPE,
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	'n8n-nodes-base.messageAnAgent',
	WAIT_NODE_TYPE,
	FORM_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	CHAT_TRIGGER_NODE_TYPE,
	MCP_TRIGGER_NODE_TYPE,
	MICROSOFT_AGENT365_TRIGGER_NODE_TYPE,
]);

const LANGCHAIN_PACKAGE_PREFIX = '@n8n/n8n-nodes-langchain.';

/** A connection slot as a node description declares it: a type name, a config object, or an expression. */
type ConnectionSlots =
	| Array<string | ({ type: string } & Record<string, unknown>)>
	| string
	| undefined;

/** The shape both a full node description and a bare suggested node satisfy. */
export interface EngineV2NodeCandidate {
	name: string;
	inputs?: ConnectionSlots;
	outputs?: ConnectionSlots;
}

/** Connection type names other than `main` look like `ai_languageModel`, `ai_tool`, ... */
const NON_MAIN_CONNECTION_PATTERN = /\bai_[A-Za-z]+\b/;

function usesOnlyMainConnections(slots: ConnectionSlots): boolean {
	if (slots === undefined) return true;
	// An expression builds the slots at run time; the type names it mentions are
	// the only thing known here.
	if (typeof slots === 'string') return !NON_MAIN_CONNECTION_PATTERN.test(slots);
	return slots.every((slot) => (typeof slot === 'string' ? slot : slot.type) === 'main');
}

/**
 * Whether engine v2 can run a node of this type. The converter only accepts
 * main connections, so every AI sub-node and root node is out; the explicit
 * list covers nodes that need host services the data plane does not have.
 *
 * A candidate known only by name cannot be checked for connection types, so a
 * LangChain package node is assumed to use them.
 */
export function isNodeTypeSupportedOnEngineV2(node: EngineV2NodeCandidate): boolean {
	if (ENGINE_V2_UNSUPPORTED_NODE_TYPES.has(node.name)) return false;
	if (node.inputs === undefined && node.outputs === undefined) {
		return !node.name.startsWith(LANGCHAIN_PACKAGE_PREFIX);
	}
	return usesOnlyMainConnections(node.inputs) && usesOnlyMainConnections(node.outputs);
}
