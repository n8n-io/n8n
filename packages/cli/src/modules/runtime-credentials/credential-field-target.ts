import { Service } from '@n8n/di';
import type { INodeProperties } from 'n8n-workflow';

import { CredentialTypes } from '@/credential-types';
import { CredentialsOverwrites } from '@/credentials-overwrites';
import { DCR_MANAGED_CREDENTIAL_FIELDS, OAUTH_PINNED_FIELDS } from '@/oauth/dcr-managed-fields';

import type { CredentialTransform } from './runtime-credentials.schemas';

/** Fields that n8n controls on every credential type, whatever the type declares. */
const PROTECTED_FIELD_NAMES: ReadonlySet<string> = new Set([
	...OAUTH_PINNED_FIELDS,
	...DCR_MANAGED_CREDENTIAL_FIELDS,
	'allowedHttpRequestDomains',
	'allowedDomains',
]);

export type ProtectedFieldOptions = {
	/** Keys that the instance overwrites for the credential type, parent types included. */
	overwriteKeys: Iterable<string>;
	/** Properties of the credential type, parent types included. */
	properties: ReadonlyArray<Pick<INodeProperties, 'name' | 'type'>>;
};

/**
 * True when a request value must never be written to the credential field `name`.
 * A field is protected when n8n pins it, DCR owns it, it has type `hidden`,
 * or the instance overwrites it for the credential type.
 */
export function isProtectedCredentialField(name: string, options: ProtectedFieldOptions): boolean {
	if (PROTECTED_FIELD_NAMES.has(name)) return true;
	if (options.properties.some((property) => property.name === name && property.type === 'hidden')) {
		return true;
	}
	return new Set(options.overwriteKeys).has(name);
}

/** The field name of a `field:<name>` transform, or undefined for any other transform. */
export function getTargetFieldName(transform: CredentialTransform | undefined): string | undefined {
	return transform?.startsWith('field:') ? transform.slice('field:'.length) : undefined;
}

/** Checks the target field of `field:<name>` rules against the credential type. */
@Service()
export class CredentialFieldTargetValidator {
	constructor(
		private readonly credentialTypes: CredentialTypes,
		private readonly credentialsOverwrites: CredentialsOverwrites,
	) {}

	/**
	 * Returns the reason a rule cannot write to its target field, or undefined when it can.
	 * Returns undefined for the `bearer` transform and for an unknown credential type.
	 */
	getError(credentialType: string, transform: CredentialTransform | undefined): string | undefined {
		const name = getTargetFieldName(transform);
		if (name === undefined || !this.credentialTypes.recognizes(credentialType)) return undefined;

		const properties = this.getProperties(credentialType);
		if (!properties.some((property) => property.name === name)) {
			return `Credential type "${credentialType}" has no field "${name}"`;
		}

		const overwriteKeys = Object.keys(
			this.credentialsOverwrites.getOverwrites(credentialType) ?? {},
		);
		if (isProtectedCredentialField(name, { overwriteKeys, properties })) {
			return `The field "${name}" of credential type "${credentialType}" is controlled by n8n and cannot receive a request value`;
		}
		return undefined;
	}

	/** Properties of the type and its parents. A property of the type wins over a parent property. */
	private getProperties(credentialType: string): INodeProperties[] {
		const properties = new Map<string, INodeProperties>();
		for (const type of [credentialType, ...this.credentialTypes.getParentTypes(credentialType)]) {
			for (const property of this.credentialTypes.getByName(type).properties) {
				if (!properties.has(property.name)) properties.set(property.name, property);
			}
		}
		return [...properties.values()];
	}
}
