import type { ICredentialDataDecryptedObject, INode, INodeProperties } from 'n8n-workflow';

// SPIKE (API-663): one operator-defined credential type that stands in for every
// credential type a node asks for. Read from env so the spike needs no config class.
export function getManagedCredentialType(): string | undefined {
	return process.env.N8N_MANAGED_CREDENTIAL_TYPE || undefined;
}

/**
 * In managed mode every credential lookup resolves to the managed type, so a real
 * credential on the node is never used. A node without an ORD ID fails in
 * `_getCredentials` before any request is sent.
 */
export function resolveManagedCredentialType(_node: INode, requestedType: string): string {
	return getManagedCredentialType() ?? requestedType;
}

// SPIKE (API-663): approach A. The ORD ID sits on the node's credential reference in the
// workflow JSON, with no stored record: `{ id: null, name, ordId }`.
export function readManagedOrdId(node: INode, managedType: string): string | undefined {
	const reference: object | undefined = node.credentials?.[managedType];
	if (!reference || !('ordId' in reference)) return undefined;
	return typeof reference.ordId === 'string' && reference.ordId ? reference.ordId : undefined;
}

/** Adds the node's ORD ID to a request it sends, including requests it builds itself. */
export function addManagedOrdId<T extends { headers?: object }>(node: INode, options: T): T;
export function addManagedOrdId<T extends { headers?: object }>(
	node: INode,
	options: T | undefined,
): T | undefined;
export function addManagedOrdId<T extends { headers?: object }>(
	node: INode,
	options: T | undefined,
): T | undefined {
	const managedType = getManagedCredentialType();
	const ordId = managedType && readManagedOrdId(node, managedType);
	if (!ordId) return options;
	return { ...options, headers: { ...options?.headers, ordID: ordId } } as T;
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
