import { computed } from 'vue';
import type { INodeCredentialsDetails } from 'n8n-workflow';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { TemplateCredentialKey } from '../utils/templateTransforms';
import { useCredentialSetupState } from './useCredentialSetupState';
import { injectWorkflowState } from '@/composables/useWorkflowState';

export const useSetupWorkflowCredentialsModalState = () => {
	const workflowsStore = useWorkflowsStore();
	const workflowState = injectWorkflowState();
	const credentialsStore = useCredentialsStore();
	const nodeHelpers = useNodeHelpers();

	const workflowNodes = computed(() => {
		return workflowsStore.allNodes;
	});

	const {
		appCredentials,
		credentialOverrides,
		credentialUsages,
		credentialsByKey,
		numFilledCredentials,
		selectedCredentialIdByKey,
		setSelectedCredentialId,
		unsetSelectedCredential,
	} = useCredentialSetupState(workflowNodes);

	/**
	 * Selects initial credentials. For existing workflows this means using
	 * the credentials that are already set on the nodes.
	 */
	const setInitialCredentialSelection = () => {
		selectedCredentialIdByKey.value = {};

		for (const credUsage of credentialUsages.value) {
			const typeCredentials = credentialsStore.getCredentialsByType(credUsage.credentialType);
			// Make sure there is a credential for this type with the given name
			const credential = typeCredentials.find((cred) => cred.name === credUsage.credentialName);
			if (!credential) {
				continue;
			}

			selectedCredentialIdByKey.value[credUsage.key] = credential.id;
		}
	};

	/**
	 * Sets the given credential to all nodes that use it.
	 */
	const setCredential = (credentialKey: TemplateCredentialKey, credentialId: string) => {
		setSelectedCredentialId(credentialKey, credentialId);

		const usages = credentialsByKey.value.get(credentialKey);
		if (!usages) {
			return;
		}

		const credentialName = credentialsStore.getCredentialById(credentialId)?.name;
		const credential: INodeCredentialsDetails = {
			id: credentialId,
			name: credentialName,
		};

		usages.usedBy.forEach((node) => {
			workflowState.updateNodeProperties({
				name: node.name,
				properties: {
					credentials: {
						...node.credentials,
						[usages.credentialType]: credential,
					},
				},
			});

			// We can't use updateNodeCredentialIssues because the previous
			// step creates a new instance of the node in the store and
			// `node` no longer points to the correct node.
			nodeHelpers.updateNodeCredentialIssuesByName(node.name);
		});

		setInitialCredentialSelection();
	};

	/**
	 * Removes given credential from all nodes that use it.
	 */
	const unsetCredential = (credentialKey: TemplateCredentialKey) => {
		unsetSelectedCredential(credentialKey);

		const usages = credentialsByKey.value.get(credentialKey);
		if (!usages) {
			return;
		}

		usages.usedBy.forEach((node) => {
			const credentials = { ...node.credentials };
			delete credentials[usages.credentialType];

			workflowState.updateNodeProperties({
				name: node.name,
				properties: {
					credentials,
				},
			});

			// We can't use updateNodeCredentialIssues because the previous
			// step creates a new instance of the node in the store and
			// `node` no longer points to the correct node.
			nodeHelpers.updateNodeCredentialIssuesByName(node.name);
		});

		setInitialCredentialSelection();
	};

	return {
		appCredentials,
		credentialOverrides,
		credentialUsages,
		credentialsByKey,
		numFilledCredentials,
		selectedCredentialIdByKey,
		setInitialCredentialSelection,
		setCredential,
		unsetCredential,
	};
};
