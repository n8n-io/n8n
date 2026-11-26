import { BadRequestError, UserError } from '@n8n/errors';
import type { Types } from 'n8n-core';
import type { INodeProperties, INodeTypeDescription } from 'n8n-workflow';

// The node signs a token with the stored private key, so it cannot work without a secret.
const SIGNING_CREDENTIAL_TYPES = new Set(['googleApi']);

/**
 * Spike (API-663): in managed mode the editor offers only the managed credential.
 * Node code is unchanged; core swaps the type at runtime.
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

function withManagedCredential(
	description: INodeTypeDescription,
	managedType: string,
): INodeTypeDescription {
	if (!description.credentials?.length) return description;

	// HTTP Request picks its credential through its own parameter: keep its list and
	// only drop the generic (secret-holding) auth types.
	if (description.name === 'n8n-nodes-base.httpRequest') {
		return {
			...description,
			properties: description.properties.map((property) =>
				withoutAuthOptions(property, new Set(['genericCredentialType'])),
			),
		};
	}

	const blockedAuthValues = new Set<string>();
	for (const credential of description.credentials) {
		if (!SIGNING_CREDENTIAL_TYPES.has(credential.name)) continue;
		for (const value of credential.displayOptions?.show?.authentication ?? []) {
			if (typeof value === 'string') blockedAuthValues.add(value);
		}
	}

	return {
		...description,
		properties: blockedAuthValues.size
			? description.properties.map((property) => withoutAuthOptions(property, blockedAuthValues))
			: description.properties,
		credentials: [{ name: managedType, required: true }],
	};
}

function withoutAuthOptions(property: INodeProperties, blocked: Set<string>): INodeProperties {
	if (property.name !== 'authentication' || !property.options) return property;

	const options = property.options.filter(
		(option) => !('value' in option) || !blocked.has(String(option.value)),
	);
	const defaultBlocked = blocked.has(String(property.default));
	const firstValue = options.find((option) => 'value' in option);
	return {
		...property,
		options,
		default:
			defaultBlocked && firstValue && 'value' in firstValue ? firstValue.value : property.default,
	};
}

export function isManagedCredentialMode(): boolean {
	return !!process.env.N8N_MANAGED_CREDENTIAL_TYPE;
}

/** Spike (API-663): in managed mode n8n builds the credential at run time, so nothing is stored. */
export function assertManagedCredentialType(_type: string): void {
	if (isManagedCredentialMode()) {
		throw new BadRequestError(
			'Credentials cannot be created on this instance. An external gateway manages them',
		);
	}
}
