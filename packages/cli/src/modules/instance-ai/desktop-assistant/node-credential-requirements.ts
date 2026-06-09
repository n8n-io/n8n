/**
 * Detect nodes whose type declares required credentials but whose workflow
 * JSON has no populated credential slot at all.
 *
 * Reuses the same primitives the workflow-builder's `setup-workflow.service.ts`
 * analysis is built on — `INodeTypeDescription.credentials` filtered by
 * `NodeHelpers.displayParameter` against parameters resolved with their
 * description defaults. Stays synchronous and skips the heavier
 * `buildSetupRequests` pipeline (parameter issues, credential cache,
 * testability checks). For the BFF classifier we just need the
 * "missing setup" signal.
 *
 * The existing slot-based detection (empty `slot.id` or inaccessible
 * credential) lives in the classifier itself; this complements it by
 * catching the case where the node has no `credentials` field at all
 * (a workflow imported / built without ever picking a credential).
 */
import type {
	INode,
	INodeCredentialDescription,
	INodeParameters,
	INodeTypeDescription,
	INodeTypes,
} from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';

/**
 * Walk a workflow's nodes and return the names of those that have no
 * `credentials` field populated but whose type description declares a
 * required credential matching the node's current parameters.
 */
export function computeNodesRequiringCredentialSetup(
	nodes: INode[],
	nodeTypes: INodeTypes,
): Set<string> {
	const result = new Set<string>();
	for (const node of nodes) {
		if (node.disabled) continue;
		// If any credential slot already exists, the classifier's slot-based
		// check handles whether it's populated correctly.
		if (node.credentials && Object.keys(node.credentials).length > 0) continue;

		const description = tryGetNodeDescription(node, nodeTypes);
		if (!description) continue;
		if (!Array.isArray(description.credentials) || description.credentials.length === 0) continue;

		// Resolve defaults from the description before evaluating displayOptions.
		// Many nodes (e.g. Gmail Trigger) gate their credentials on parameters
		// whose values come from the description's default rather than being
		// stored on the workflow JSON. Mirrors `resolveDisplayedDefaults` in
		// the adapter service's getNodeCredentialTypes.
		const resolvedParameters = resolveParametersWithDefaults(node, description);
		const nodeWithDefaults: INode = { ...node, parameters: resolvedParameters };

		const hasRequired = description.credentials.some((credentialDesc) =>
			nodeRequiresCredential(credentialDesc, nodeWithDefaults, description),
		);
		if (hasRequired) result.add(node.name);
	}
	return result;
}

function tryGetNodeDescription(
	node: INode,
	nodeTypes: INodeTypes,
): INodeTypeDescription | undefined {
	try {
		return nodeTypes.getByNameAndVersion(node.type, node.typeVersion).description;
	} catch {
		return undefined;
	}
}

function resolveParametersWithDefaults(
	node: INode,
	description: INodeTypeDescription,
): INodeParameters {
	const parameters: INodeParameters = node.parameters ?? {};
	try {
		const resolved = NodeHelpers.getNodeParameters(
			description.properties,
			parameters,
			true,
			false,
			node,
			description,
		);
		return resolved ?? parameters;
	} catch {
		return parameters;
	}
}

function nodeRequiresCredential(
	credentialDesc: INodeCredentialDescription,
	node: INode,
	description: INodeTypeDescription,
): boolean {
	if (credentialDesc.required === false) return false;
	if (!credentialDesc.displayOptions) return true;
	try {
		return NodeHelpers.displayParameter(node.parameters, credentialDesc, node, description);
	} catch {
		// If displayOptions evaluation throws (malformed parameters etc.),
		// be conservative and treat the credential as required so the user
		// is nudged to inspect it.
		return true;
	}
}
