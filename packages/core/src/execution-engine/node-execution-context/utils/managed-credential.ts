import type { ICredentialDataDecryptedObject, INodeProperties } from 'n8n-workflow';

// Spike (API-663): read from env so the spike needs no config class.
export function getManagedCredentialType(): string | undefined {
	return process.env.N8N_MANAGED_CREDENTIAL_TYPE || undefined;
}

export function resolveManagedCredentialType(requestedType: string): string {
	return getManagedCredentialType() ?? requestedType;
}

const PLACEHOLDER_URL = 'https://managed.example.com';
const PLACEHOLDER_TEXT = 'managed';
// A subdomain is one label of a host the node builds itself, never a full URL.
const URL_LIKE_FIELD = /url|(?<!sub)domain|host|endpoint|server|instance/i;

/**
 * Nodes read config fields (Jira `domain`, Zendesk `subdomain`) from their own type.
 * Give them the type's defaults, else the field's UI example, else a placeholder.
 */
export function fillManagedPlaceholders(
	properties: INodeProperties[],
): ICredentialDataDecryptedObject {
	const filled: Record<string, unknown> = {};
	for (const property of properties) {
		if (property.type === 'notice' || property.type === 'hidden') {
			if (property.default !== undefined) filled[property.name] = property.default;
			continue;
		}
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
	return filled as ICredentialDataDecryptedObject;
}
