import { NodeOperationError } from 'n8n-workflow';
import type { ICredentialDataDecryptedObject, INode, INodeProperties } from 'n8n-workflow';

// SPIKE (API-663): one operator-defined credential type that stands in for every
// credential type a node asks for. Read from env so the spike needs no config class.
export function getManagedCredentialType(): string | undefined {
	return process.env.N8N_MANAGED_CREDENTIAL_TYPE || undefined;
}

/**
 * In managed mode every credential lookup resolves to the managed type, so a real
 * credential on the node is never used. A node whose reference misses a required field of
 * the managed type fails in `_getCredentials` before any request is sent.
 */
export function resolveManagedCredentialType(_node: INode, requestedType: string): string {
	return getManagedCredentialType() ?? requestedType;
}

/**
 * SPIKE (API-663): no credential is stored. The node's reference to the managed type holds
 * the platform's data instead, for example `{ id: null, name, ordId }`. That data becomes
 * `$credentials` for the managed type's `authenticate`, the same way Gateway credits marks a node.
 */
export function getManagedReferenceData(
	node: INode,
	managedType: string,
): ICredentialDataDecryptedObject {
	const reference: object | undefined = node.credentials?.[managedType];
	if (!reference) return {};
	const data: ICredentialDataDecryptedObject = {};
	for (const [key, value] of Object.entries(reference)) {
		if (key === 'id' || key === 'name' || key === '__aiGatewayManaged') continue;
		data[key] = value as ICredentialDataDecryptedObject[string];
	}
	return data;
}

/** Required fields of the managed type that the node's reference leaves empty. */
export function findMissingManagedFields(
	properties: INodeProperties[],
	data: ICredentialDataDecryptedObject,
): string[] {
	return properties
		.filter((property) => property.required && property.type !== 'notice')
		.filter(({ name }) => data[name] === undefined || data[name] === '')
		.map(({ name }) => name);
}

/** The node's managed data. Fails before any request when a required field is missing. */
export function getValidManagedData(
	node: INode,
	managedType: string,
	managedProperties: INodeProperties[],
): ICredentialDataDecryptedObject {
	const data = getManagedReferenceData(node, managedType);
	const missing = findMissingManagedFields(managedProperties, data);
	if (missing.length) {
		throw new NodeOperationError(
			node,
			`Add ${missing.join(', ')} to this node's managed credential`,
		);
	}
	return data;
}

const PLACEHOLDER_URL = 'https://managed.example.com';
const PLACEHOLDER_TEXT = 'managed';
// A subdomain is one label of a host the node builds itself, never a full URL.
const URL_LIKE_FIELD = /url|(?<!sub)domain|host|endpoint|server|instance/i;

/**
 * Nodes read config fields (Jira `domain`, Zendesk `subdomain`) from their own type.
 * Give them the type's defaults, else the field's UI example, else a placeholder. The external
 * gateway finds the real target, so the placeholder host never leaves the platform's network.
 */
export function fillManagedPlaceholders(
	properties: INodeProperties[],
	managedData: ICredentialDataDecryptedObject,
): ICredentialDataDecryptedObject {
	const filled: Record<string, unknown> = {};
	for (const property of properties) {
		if (property.type === 'notice' || property.type === 'hidden') {
			if (property.default !== undefined) filled[property.name] = property.default;
			continue;
		}
		// The external gateway adds the real secret, and wants no placeholder in its place.
		if (property.typeOptions?.password) {
			filled[property.name] = '';
			continue;
		}
		const hasDefault = property.default !== undefined && property.default !== '';
		if (hasDefault) filled[property.name] = property.default;
		// The UI example value has the format the node expects (full URL vs subdomain).
		else if (property.type === 'string' && property.placeholder)
			filled[property.name] = property.placeholder;
		else if (property.type === 'string')
			filled[property.name] = URL_LIKE_FIELD.test(property.name)
				? PLACEHOLDER_URL
				: PLACEHOLDER_TEXT;
	}
	return { ...filled, ...managedData } as ICredentialDataDecryptedObject;
}
