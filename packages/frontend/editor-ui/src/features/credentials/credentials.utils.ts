import type {
	ICredentialType,
	INodeCredentialsDetails,
	NodeParameterValueType,
} from 'n8n-workflow';

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
 * credential across its displayed credential types.
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

	const allOptions = credentialTypesNodeDescriptionDisplayed.value.flatMap((type) => type.options);
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
 * Kept here, clear of `useCredentialOAuth`, because several suites mock that
 * composable as a whole and a production import of it would resolve to nothing.
 */
export function hasManagedOAuthApp(credentialType: ICredentialType | null | undefined): boolean {
	if (!credentialType || credentialType.__skipManagedCreation) return false;

	const overwrittenProperties = credentialType.__overwrittenProperties ?? [];
	return (
		overwrittenProperties.includes('clientId') && overwrittenProperties.includes('clientSecret')
	);
}
