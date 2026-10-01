/**
 * By default all fields that are defined in the schema are considered static.
 * If a field is not defined in the schema, it is considered dynamic.
 * If a field is marked as dynamic in the schema it is considered dynamic.
 */
import { Container } from '@n8n/di';
import isEqual from 'lodash/isEqual';
import {
	CREDENTIAL_BLANKING_VALUE,
	NodeHelpers,
	type ICredentialDataDecryptedObject,
	type ICredentialType,
	type INodeProperties,
} from 'n8n-workflow';

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

/**
 * Shared (static, non-resolvable) fields whose value differs between stored and
 * incoming data. Only fields present in `newData` are considered; the redaction
 * placeholder never counts as a change (defensive — caller should un-redact first).
 */
export function getChangedSharedFields(
	credentialType: ICredentialType,
	oldData: ICredentialDataDecryptedObject,
	newData: ICredentialDataDecryptedObject,
): string[] {
	const sharedFields = extractSharedFields(credentialType);

	return sharedFields.filter((field) => {
		if (!(field in newData)) return false;
		if (newData[field] === CREDENTIAL_BLANKING_VALUE) return false;
		return !isEqual(oldData[field], newData[field]);
	});
}
