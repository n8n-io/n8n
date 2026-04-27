import type { InstanceAiWorkflowSetupNode } from '@n8n/api-types';
import { computed, type ComputedRef, type Ref } from 'vue';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import type { WorkflowSetupCard } from '../workflowSetup.types';

export function useWorkflowSetupCards(
	setupRequests: Ref<InstanceAiWorkflowSetupNode[]> | ComputedRef<InstanceAiWorkflowSetupNode[]>,
): { cards: ComputedRef<WorkflowSetupCard[]> } {
	const credentialsStore = useCredentialsStore();

	const cards = computed<WorkflowSetupCard[]>(() => {
		const result: WorkflowSetupCard[] = [];

		for (const req of setupRequests.value) {
			if (!req.credentialType) continue;

			const credentialType = req.credentialType;
			const currentCredentialId =
				req.node.credentials?.[credentialType]?.id ??
				credentialsStore.allCredentials.find((credential) => credential.type === credentialType)
					?.id ??
				null;

			result.push({
				id: `${req.node.name}:${credentialType}`,
				credentialType,
				targetNodeName: req.node.name,
				node: req.node,
				currentCredentialId,
			});
		}

		return result;
	});

	return { cards };
}
