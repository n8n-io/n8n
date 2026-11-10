import type {
	ICredentialType,
	INodeCredentialsDetails,
	NodeParameterValueType,
} from 'n8n-workflow';

import { getCredentialTypeRestriction } from '@n8n/frontend-module-type-availability-policies';

import type { INodeUi } from '@/Interface';
import { isEmpty } from '@/app/utils/typesUtils';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useNodeCredentialOptions } from './composables/useNodeCredentialOptions';
import type { ICredentialsResponse } from './credentials.types';

export interface AutoSelectedCredential {
	credentialType: string;
	credential: INodeCredentialsDetails;
}

/**
 * For a node with no credentials set, pick the most recently updated usable
 * credential across its displayed credential types. A policy-blocked type is
 * never picked, because its row in the dropdown is disabled.
 *
 * `overrideCredentials` must match what the host's dropdown renders from, so
 * "nothing to auto-select" and "dropdown is empty" stay the same condition.
 */
export function getAutoSelectedCredential(
	node: INodeUi,
	overrideCredType: NodeParameterValueType = '',
	overrideCredentials?: ICredentialsResponse[],
): AutoSelectedCredential | undefined {
	if (!isEmpty(node.credentials ?? {})) return undefined;

	const nodeTypesStore = useNodeTypesStore();
	const { credentialTypesNodeDescriptionDisplayed } = useNodeCredentialOptions(
		node,
		nodeTypesStore.getNodeType(node.type, node.typeVersion),
		overrideCredType,
		false,
		overrideCredentials,
	);

	const allOptions = credentialTypesNodeDescriptionDisplayed.value
		.flatMap((type) => type.options)
		.filter((option) => !getCredentialTypeRestriction(option.type));
	if (allOptions.length === 0) return undefined;

	const mostRecent = allOptions.reduce((a, b) => (a.updatedAt > b.updatedAt ? a : b));
	return {
		credentialType: mostRecent.type,
		credential: { id: mostRecent.id, name: mostRecent.name },
	};
}

/**
 * Whether the instance supplies the OAuth app (client ID and secret) for this
 * credential type. Required fields the overwrites do not cover stay the user's
 * to fill, so this is a weaker condition than `canOAuthCredentialQuickConnect`.
 *
 * It takes the type, not a name, so it needs no store and lives here rather
 * than in `useCredentialOAuth`.
 */
export function hasManagedOAuthApp(credentialType: ICredentialType | undefined): boolean {
	if (!credentialType || credentialType.__skipManagedCreation) return false;

	const overwrittenProperties = credentialType.__overwrittenProperties ?? [];
	return (
		overwrittenProperties.includes('clientId') && overwrittenProperties.includes('clientSecret')
	);
}

/**
 * Whether a credential type matches the `credentialTypes` of a `credentialsSelect` parameter,
 * such as `extends:oAuth2Api` or `has:authenticate`.
 */
export function isCredentialTypeSupported(
	credentialType: ICredentialType,
	credentialTypes: string[],
	nodeType: string,
	getCredentialType: (name: string) => ICredentialType | undefined,
): boolean {
	if (credentialType.hidden) return false;

	// Exclude credentials that opt into node-restriction when the current
	// node is not in their supportedNodes list. Mirrors the server-side
	// `isCredentialUsableByNode` policy so the UI does not offer a choice
	// that the API/runtime would reject.
	if (
		credentialType.restrictToSupportedNodes &&
		!credentialType.supportedNodes?.includes(nodeType)
	) {
		return false;
	}

	const supportedHas = credentialTypes.flatMap((entry) =>
		entry.startsWith('has:') ? [entry.slice('has:'.length)] : [],
	);
	const supportedExtends = credentialTypes.flatMap((entry) =>
		entry.startsWith('extends:') ? [entry.slice('extends:'.length)] : [],
	);

	for (const property of supportedHas) {
		if (credentialType[property as keyof ICredentialType] !== undefined) {
			// generic-auth credentials (e.g. httpHeaderAuth) may also define
			// `authenticate`; they belong in the generic auth dropdown, not the
			// predefined credential type list
			if (property === 'authenticate' && credentialType.genericAuth === true) continue;

			return true;
		}
	}

	const parentNames = credentialType.extends ?? [];
	if (parentNames.some((parentName) => supportedExtends.includes(parentName))) return true;
	if (supportedExtends.length === 0) return false;

	// recurse upward until base credential type
	// e.g. microsoftDynamicsOAuth2Api -> microsoftOAuth2Api -> oAuth2Api
	return parentNames.some((parentName) => {
		const parent = getCredentialType(parentName);
		return parent
			? isCredentialTypeSupported(parent, credentialTypes, nodeType, getCredentialType)
			: false;
	});
}
