/**
 * By default all fields that are defined in the schema are considered static.
 * If a field is not defined in the schema, it is considered dynamic.
 * If a field is marked as dynamic in the schema it is considered dynamic.
 */
import { Container } from '@n8n/di';
import { NodeHelpers, type ICredentialType, type INodeProperties } from 'n8n-workflow';

import { CredentialTypes } from '@/credential-types';

// Build merged properties from credential hierarchy
function getExtendedProps(
	type: ICredentialType,
	credentialTypes: CredentialTypes,
): INodeProperties[] {
	const props: INodeProperties[] = [];

	// Recursively get parent properties first (bottom-up)
	for (const parentTypeName of type.extends ?? []) {
		const parentType = credentialTypes.getByName(parentTypeName);
		const parentProps = getExtendedProps(parentType, credentialTypes);
		NodeHelpers.mergeNodeProperties(props, parentProps);
	}

	// Merge current type's properties (child properties override parent)
	NodeHelpers.mergeNodeProperties(props, type.properties);

	return props;
}

export function extractSharedFields(credentialType: ICredentialType): string[] {
	const credentialTypes = Container.get(CredentialTypes);

	const mergedProperties = getExtendedProps(credentialType, credentialTypes);

	const sharedFields: string[] = [];

	for (const property of mergedProperties) {
		// If a field is not marked as resolvable, consider it static
		if (property.resolvableField !== true) {
			sharedFields.push(property.name);
		}
	}

	return sharedFields;
}
