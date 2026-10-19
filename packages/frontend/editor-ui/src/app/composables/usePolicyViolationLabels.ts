import type { PolicyViolation } from '@n8n/api-types';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';

export const NODE_TYPE_SUBJECT = 'nodeType';
export const CREDENTIAL_TYPE_SUBJECT = 'credentialType';

export function usePolicyViolationLabels() {
	const nodeTypesStore = useNodeTypesStore();
	const credentialsStore = useCredentialsStore();

	/** The display name of the node or credential type a violation names, if known. */
	function labelOf({ subject, subjectType }: PolicyViolation): string | undefined {
		if (subject === undefined) return undefined;

		if (subjectType === NODE_TYPE_SUBJECT) return nodeTypesStore.getNodeType(subject)?.displayName;
		if (subjectType === CREDENTIAL_TYPE_SUBJECT) {
			return credentialsStore.getCredentialTypeByName(subject)?.displayName;
		}

		return undefined;
	}

	return { labelOf };
}
