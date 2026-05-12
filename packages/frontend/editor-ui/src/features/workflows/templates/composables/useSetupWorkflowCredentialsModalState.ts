import { computed } from 'vue';
import type { INodeCredentialsDetails } from 'n8n-workflow';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import type { TemplateCredentialKey } from '../utils/templateTransforms';
import { useCredentialSetupState } from './useCredentialSetupState';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';

export const useSetupWorkflowCredentialsModalState = () => {
	const workflowsStore = useWorkflowsStore();
	const credentialsStore = useCredentialsStore();
	const nodeHelpers = useNodeHelpers();

	// This composable is used inside a modal that renders outside the WorkflowLayout
	// provider tree, so we can't use injectWorkflowDocumentStore(). Instead, we
	// access the Pinia store directly using the current workflow ID.
	const workflowDocumentStore = computed(() => {
		const workflowId = workflowsStore.workflowId;
		if (!workflowId) return undefined;
		return useWorkflowDocumentStore(createWorkflowDocumentId(workflowId));
	});

	const workflowNodes = computed(() => {
		return workflowDocumentStore.value?.allNodes ?? [];
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
			workflowDocumentStore.value?.updateNodeProperties({
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

			workflowDocumentStore.value?.updateNodeProperties({
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
