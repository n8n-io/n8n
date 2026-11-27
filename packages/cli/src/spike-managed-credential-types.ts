import { UserError } from '@n8n/errors';
import type { Types } from 'n8n-core';
import type { INodeTypeDescription } from 'n8n-workflow';

/**
 * Spike (API-663): in managed mode every node uses the managed credential, and the editor
 * offers only the managed type. Node code is unchanged; core swaps the type at runtime.
 */
export function applyManagedCredentialToTypes(types: Types): void {
	const managedType = process.env.N8N_MANAGED_CREDENTIAL_TYPE;
	if (!managedType) return;
	if (!types.credentials.some(({ name }) => name === managedType)) {
		throw new UserError(
			`N8N_MANAGED_CREDENTIAL_TYPE is "${managedType}", but no credential type with that name is loaded. Check N8N_CUSTOM_EXTENSIONS`,
		);
	}

	types.nodes = types.nodes.map((description) => withManagedCredential(description, managedType));
	types.credentials = types.credentials.filter(({ name }) => name === managedType);
}

/** Spike (API-663): the same change for one description that the editor fetches on its own. */
export function applyManagedCredentialToDescription(
	description: INodeTypeDescription,
	nodeTypeName = description.name,
): INodeTypeDescription {
	const managedType = process.env.N8N_MANAGED_CREDENTIAL_TYPE;
	return managedType ? withManagedCredential(description, managedType, nodeTypeName) : description;
}

const HTTP_REQUEST_NODE_TYPES = new Set([
	'n8n-nodes-base.httpRequest',
	'n8n-nodes-base.httpRequestTool',
]);

function withManagedCredential(
	description: INodeTypeDescription,
	managedType: string,
	nodeTypeName = description.name,
): INodeTypeDescription {
	if (!description.credentials?.length) return description;
	// HTTP Request picks its credential type in its own parameter, which lists the loaded types.
	if (HTTP_REQUEST_NODE_TYPES.has(nodeTypeName)) return description;

	return { ...description, credentials: [{ name: managedType, required: true }] };
}
