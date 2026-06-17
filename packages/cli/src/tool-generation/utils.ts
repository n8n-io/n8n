import type {
	INodeTypeBaseDescription,
	INodeTypeDescription,
	KnownNodesAndCredentials,
} from 'n8n-workflow';

/**
 * Type guard to check if a description is a full INodeTypeDescription.
 */
export function isFullDescription(obj: unknown): obj is INodeTypeDescription {
	return typeof obj === 'object' && obj !== null && 'properties' in obj;
}

/**
 * Copy credential support from an original node to a new tool node.
 * This ensures the tool node can use the same credentials as the original.
 */
export function copyCredentialSupport(
	known: KnownNodesAndCredentials,
	originalNodeName: string,
	newNodeName: string,
): void {
	const credentialNames = Object.entries(known.credentials)
		.filter(([_, credential]) => credential?.supportedNodes?.includes(originalNodeName))
		.map(([credentialName]) => credentialName);

	credentialNames.forEach((name) => {
		known.credentials[name]?.supportedNodes?.push(newNodeName);
	});
}

/**
 * Set the codex categories for an AI tool node.
 * If preserveExisting is true, keeps the existing Tools subcategory if present.
 */
export function setToolCodex(
	description: INodeTypeDescription | INodeTypeBaseDescription,
	toolSubcategory: string,
	preserveExisting = false,
): void {
	const resources = description.codex?.resources ?? {};
	const existingToolsSubcategory = description.codex?.subcategories?.Tools;

	description.codex = {
		categories: ['AI'],
		subcategories: {
			AI: ['Tools'],
			Tools:
				preserveExisting && existingToolsSubcategory ? existingToolsSubcategory : [toolSubcategory],
		},
		resources,
	};
}
