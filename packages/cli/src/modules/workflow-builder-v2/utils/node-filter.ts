import type { INodeTypeDescription } from 'n8n-workflow';
import { isSubNodeType } from 'n8n-workflow';

/**
 * Function shape used by the builder tools to resolve a node-type description
 * by name + version. Returning `null` means "unknown node type".
 *
 * In production this is wired to `NodeTypes.getByNameAndVersion(...).description`.
 * In tests it can be a stub returning the relevant `outputs` shape.
 */
export type LookupNodeDescription = (
	nodeType: string,
	version: number,
) => INodeTypeDescription | null;

export type StandaloneCheck = { allowed: true } | { allowed: false; reason: string };

/**
 * Decide whether a candidate node type is a valid top-level workflow node.
 *
 * Sub-nodes (language models, memory, embeddings, tools, document loaders,
 * text splitters, output parsers, vector stores, etc.) only emit non-`main`
 * connection types and feed UPWARD into parent AI Agent/Chain nodes. They
 * cannot stand alone on a canvas — proposing them as workflow steps breaks
 * the user's workflow.
 *
 * Rule: if the node's outputs contain anything that isn't `main`, treat it as
 * a sub-node and reject. This utility intentionally leaves unknown node types
 * alone; callers that need strict validation should resolve the node version
 * before this check.
 */
export function checkStandalone(
	nodeType: string,
	version: number,
	lookup: LookupNodeDescription,
): StandaloneCheck {
	const description = lookup(nodeType, version);
	if (!description) {
		// Unknown node: standalone status cannot be determined here.
		return { allowed: true };
	}

	if (isSubNodeType(description)) {
		return {
			allowed: false,
			reason:
				`Candidate "${nodeType}" is a sub-node (its outputs do not include \`main\`). ` +
				'Sub-nodes (language models, memory, embeddings, tools, document loaders, ' +
				'text splitters, output parsers, vector stores) attach to parent AI Agent or ' +
				'Chain nodes via specialized connection types and cannot be standalone ' +
				'workflow steps. Propose top-level nodes only — e.g. ' +
				'`@n8n/n8n-nodes-langchain.agent` or `@n8n/n8n-nodes-langchain.chainLlm` for ' +
				'AI workflows.',
		};
	}

	return { allowed: true };
}
