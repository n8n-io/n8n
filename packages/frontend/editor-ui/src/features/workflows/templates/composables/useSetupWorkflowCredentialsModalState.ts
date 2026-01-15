import { computed } from 'vue';
import type { INodeCredentialsDetails, NodeParameterValueType } from 'n8n-workflow';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import type { TemplateCredentialKey } from '../utils/templateTransforms';
import { useCredentialSetupState } from './useCredentialSetupState';
import { useParameterSetupState } from './useParameterSetupState';
import { injectWorkflowState } from '@/app/composables/useWorkflowState';
import type { ParameterKey } from '../templates.types';

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

	const {
		nodesWithRequiredParameters,
		allRequiredParameterUsages,
		parameterValues,
		numFilledParameters,
		numTotalRequiredParameters,
		setParameterValue: setParameterValueInternal,
		setInitialParameterValues,
	} = useParameterSetupState(workflowNodes);

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

	/**
	 * Sets a parameter value on the node in the workflow.
	 */
	const setParameterValue = (parameterKey: ParameterKey, value: NodeParameterValueType) => {
		setParameterValueInternal(parameterKey, value);

		// Find the parameter usage to get node name and parameter name
		const usage = allRequiredParameterUsages.value.find((u) => u.key === parameterKey);
		if (!usage) {
			return;
		}

		// Update the node in the workflow
		const node = workflowsStore.getNodeByName(usage.nodeName);
		if (!node) {
			return;
		}

		workflowState.updateNodeProperties({
			name: usage.nodeName,
			properties: {
				parameters: {
					...node.parameters,
					[usage.parameter.name]: value,
				},
			},
		});

		// Re-initialize to pick up any changes to displayOptions
		// (some parameters may become visible/hidden based on other parameter values)
		setInitialParameterValues();
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
		// Parameter-related exports
		nodesWithRequiredParameters,
		parameterValues,
		numFilledParameters,
		numTotalRequiredParameters,
		setParameterValue,
		setInitialParameterValues,
	};
};
