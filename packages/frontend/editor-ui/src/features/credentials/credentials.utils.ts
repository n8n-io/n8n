import type { INodeCredentialsDetails, NodeParameterValueType } from 'n8n-workflow';

import type { INodeUi } from '@/Interface';
import { isEmpty } from '@/app/utils/typesUtils';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useNodeCredentialOptions } from './composables/useNodeCredentialOptions';

export interface AutoSelectedCredential {
	credentialType: string;
	credential: INodeCredentialsDetails;
}

/**
 * For a node with no credentials set, pick the most recently updated usable
 * credential across its displayed credential types.
 */
export function getAutoSelectedCredential(
	node: INodeUi,
	overrideCredType: NodeParameterValueType = '',
): AutoSelectedCredential | undefined {
	if (!isEmpty(node.credentials ?? {})) return undefined;

	const nodeTypesStore = useNodeTypesStore();
	const { credentialTypesNodeDescriptionDisplayed } = useNodeCredentialOptions(
		node,
		nodeTypesStore.getNodeType(node.type, node.typeVersion),
		overrideCredType,
	);

	const allOptions = credentialTypesNodeDescriptionDisplayed.value.flatMap((type) => type.options);
	if (allOptions.length === 0) return undefined;

	const mostRecent = allOptions.reduce((a, b) => (a.updatedAt > b.updatedAt ? a : b));
	return {
		credentialType: mostRecent.type,
		credential: { id: mostRecent.id, name: mostRecent.name },
	};
}
