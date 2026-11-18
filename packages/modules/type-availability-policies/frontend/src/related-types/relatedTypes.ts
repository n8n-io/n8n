import { isHitlToolType, type INodeTypeDescription } from 'n8n-workflow';

import { GENERIC_CREDENTIAL_TYPES, RELATION_EXCLUDED_NODE_TYPES } from './relatedTypes.constants';

const TOOL_SUFFIX = 'Tool';
const HITL_TOOL_SUFFIX = 'HitlTool';

type BaseLookup = (name: string) => Pick<INodeTypeDescription, 'usableAsTool'> | null | undefined;

/**
 * The base node type of a `*Tool` or `*HitlTool` variant that n8n generates at startup, or
 * `undefined` for any other node type. A rule on the base also covers the variant. Real node types
 * such as `agentTool` also end in `Tool`, so a `Tool` variant needs a base usable as a tool.
 */
export function getGeneratedToolVariantBase(
	name: string,
	getNodeType: BaseLookup,
): string | undefined {
	if (isHitlToolType(name)) {
		const base = name.slice(0, -HITL_TOOL_SUFFIX.length);
		return getNodeType(base) ? base : undefined;
	}
	if (!name.endsWith(TOOL_SUFFIX)) return undefined;

	const base = name.slice(0, -TOOL_SUFFIX.length);
	return getNodeType(base)?.usableAsTool ? base : undefined;
}

export type CredentialTypeIndex = {
	/** Every node type that lists the credential type in any version. Nothing is filtered out. */
	nodeTypesByCredentialType: ReadonlyMap<string, ReadonlySet<string>>;
	credentialTypesByNodeType: ReadonlyMap<string, ReadonlySet<string>>;
	latestNodeTypes: ReadonlyMap<string, INodeTypeDescription>;
	/** Node types that are usable as a tool in any version. n8n generates a Tool variant for each such version. */
	toolCapableNodeTypes: ReadonlySet<string>;
};

function addTo(map: Map<string, Set<string>>, key: string, value: string) {
	const values = map.get(key) ?? new Set<string>();
	values.add(value);
	map.set(key, values);
}

function latestVersion(description: INodeTypeDescription): number {
	return Array.isArray(description.version)
		? Math.max(...description.version)
		: description.version;
}

/**
 * Links each credential type to the node types that list it in `credentials[]`, over every version.
 * It does not use `supportedNodes`, because the build computes that per package and misses the
 * node types of other packages.
 */
export function buildCredentialTypeIndex(
	descriptions: readonly INodeTypeDescription[],
): CredentialTypeIndex {
	const nodeTypesByCredentialType = new Map<string, Set<string>>();
	const credentialTypesByNodeType = new Map<string, Set<string>>();
	const latestNodeTypes = new Map<string, INodeTypeDescription>();
	const toolCapableNodeTypes = new Set<string>();

	for (const description of descriptions) {
		const latest = latestNodeTypes.get(description.name);
		if (!latest || latestVersion(description) > latestVersion(latest)) {
			latestNodeTypes.set(description.name, description);
		}
		if (description.usableAsTool) toolCapableNodeTypes.add(description.name);

		for (const credential of description.credentials ?? []) {
			addTo(nodeTypesByCredentialType, credential.name, description.name);
			addTo(credentialTypesByNodeType, description.name, credential.name);
		}
	}

	return {
		nodeTypesByCredentialType,
		credentialTypesByNodeType,
		latestNodeTypes,
		toolCapableNodeTypes,
	};
}

export type RelatedTypes = {
	nodeTypes: string[];
	credentialTypes: string[];
};

/** A node type that a related section can show: known, visible, and not a generated Tool variant. */
function isRelatableNodeType(name: string, index: CredentialTypeIndex): boolean {
	const { latestNodeTypes, toolCapableNodeTypes } = index;
	const getNodeType = (base: string) =>
		latestNodeTypes.has(base)
			? { usableAsTool: toolCapableNodeTypes.has(base) || undefined }
			: undefined;
	const latest = latestNodeTypes.get(name);
	return (
		latest !== undefined &&
		!latest.hidden &&
		getGeneratedToolVariantBase(name, getNodeType) === undefined
	);
}

/**
 * The node types that list `credentialType`, and the other credential types of those node types.
 * A credential type that node types of several products share, such as Google Service Account,
 * relates all of them, because a rule on it applies to all of them.
 */
export function getCredentialRelatedTypes(
	credentialType: string,
	index: CredentialTypeIndex,
): RelatedTypes {
	if (GENERIC_CREDENTIAL_TYPES.has(credentialType)) return { nodeTypes: [], credentialTypes: [] };

	const nodeTypes = [...(index.nodeTypesByCredentialType.get(credentialType) ?? [])].filter(
		(name) => !RELATION_EXCLUDED_NODE_TYPES.has(name) && isRelatableNodeType(name, index),
	);

	const credentialTypes = new Set<string>();
	for (const nodeType of nodeTypes) {
		for (const other of index.credentialTypesByNodeType.get(nodeType) ?? []) {
			if (other !== credentialType && !GENERIC_CREDENTIAL_TYPES.has(other)) {
				credentialTypes.add(other);
			}
		}
	}

	return { nodeTypes, credentialTypes: [...credentialTypes] };
}
