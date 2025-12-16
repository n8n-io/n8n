/**
 * By default all fields that are defined in the schema are considered static.
 * If a field is not defined in the schema, it is considered dynamic.
 * If a field is marked as dynamic in the schema it is considered dynamic.
 */
import type { ICredentialType } from 'n8n-workflow';

export function extractSharedFields(credentialType: ICredentialType): string[] {
	const sharedFields: string[] = [];

	for (const property of credentialType.properties) {
		// If a field is not marked as resolvable, consider it static
		if (property.resolvableField !== true) {
			sharedFields.push(property.name);
		}
	}

	return sharedFields;
}
