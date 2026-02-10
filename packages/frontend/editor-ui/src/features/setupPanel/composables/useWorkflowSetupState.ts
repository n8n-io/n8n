import { computed, type Ref } from 'vue';
import sortBy from 'lodash/sortBy';

import type { INodeUi } from '@/Interface';
import type { NodeSetupState } from '../setupPanel.types';

import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { injectWorkflowState } from '@/app/composables/useWorkflowState';
import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';

import { getNodeCredentialTypes, buildNodeSetupState } from '../setupPanel.utils';

/**
 * Composable that manages workflow setup state for credential configuration.
 * Derives state from node type definitions and current node credentials,
 * marking nodes as complete/incomplete based on credential selection and issues.
 * @param nodes Optional sub-set of nodes to check (defaults to full workflow)
 */
export const useWorkflowSetupState = (nodes?: Ref<INodeUi[]>) => {
	const workflowsStore = useWorkflowsStore();
	const credentialsStore = useCredentialsStore();
	const nodeTypesStore = useNodeTypesStore();
	const nodeHelpers = useNodeHelpers();
	const workflowState = injectWorkflowState();
	const toast = useToast();
	const i18n = useI18n();

	const sourceNodes = computed(() => nodes?.value ?? workflowsStore.allNodes);

	const getCredentialDisplayName = (credentialType: string): string => {
		const credentialTypeInfo = credentialsStore.getCredentialTypeByName(credentialType);
		return credentialTypeInfo?.displayName ?? credentialType;
	};

	/**
	 * Get nodes that require credentials, sorted by X position (left to right).
	 */
	const nodesRequiringCredentials = computed(() => {
		const nodesWithCredentials = sourceNodes.value
			.filter((node) => !node.disabled)
			.map((node) => ({
				node,
				credentialTypes: getNodeCredentialTypes(nodeTypesStore, node),
			}))
			.filter(({ credentialTypes }) => credentialTypes.length > 0);

		return sortBy(nodesWithCredentials, ({ node }) => node.position[0]);
	});

	/**
	 * Map of credential type -> node names that require it (for shared credential awareness in UI)
	 */
	const credentialTypeToNodeNames = computed(() => {
		const map = new Map<string, string[]>();
		for (const { node, credentialTypes } of nodesRequiringCredentials.value) {
			for (const credType of credentialTypes) {
				const existing = map.get(credType) ?? [];
				existing.push(node.name);
				map.set(credType, existing);
			}
		}
		return map;
	});

	/**
	 * Node setup states - one entry per node that requires credentials.
	 * This data is used by cards component.
	 */
	const nodeSetupStates = computed<NodeSetupState[]>(() =>
		nodesRequiringCredentials.value.map(({ node, credentialTypes }) =>
			buildNodeSetupState(
				node,
				credentialTypes,
				getCredentialDisplayName,
				credentialTypeToNodeNames.value,
			),
		),
	);

	const totalCredentialsMissing = computed(() => {
		return nodeSetupStates.value.reduce((total, state) => {
			const missing = state.credentialRequirements.filter(
				(req) => !req.selectedCredentialId || req.issues.length > 0,
			);
			return total + missing.length;
		}, 0);
	});

	const totalNodesRequiringSetup = computed(() => {
		return nodeSetupStates.value.length;
	});

	const isAllComplete = computed(() => {
		return (
			nodeSetupStates.value.length > 0 && nodeSetupStates.value.every((state) => state.isComplete)
		);
	});

	/**
	 * Sets a credential for a node and auto-assigns it to other nodes in setup panel that need it.
	 * @param nodeName
	 * @param credentialType
	 * @param credentialId
	 * @returns
	 */
	const setCredential = (nodeName: string, credentialType: string, credentialId: string): void => {
		const credential = credentialsStore.getCredentialById(credentialId);
		if (!credential) return;

		const node = workflowsStore.getNodeByName(nodeName);
		if (!node) return;

		const credentialDetails = { id: credentialId, name: credential.name };

		workflowState.updateNodeProperties({
			name: nodeName,
			properties: {
				credentials: {
					...node.credentials,
					[credentialType]: credentialDetails,
				},
			},
		});
		nodeHelpers.updateNodeCredentialIssuesByName(nodeName);

		const otherNodesUpdated: string[] = [];

		for (const state of nodeSetupStates.value) {
			if (state.node.name === nodeName) continue;

			const needsThisCredential = state.credentialRequirements.some(
				(req) => req.credentialType === credentialType && !req.selectedCredentialId,
			);

			if (needsThisCredential) {
				const targetNode = workflowsStore.getNodeByName(state.node.name);
				if (targetNode) {
					workflowState.updateNodeProperties({
						name: state.node.name,
						properties: {
							credentials: {
								...targetNode.credentials,
								[credentialType]: credentialDetails,
							},
						},
					});
					otherNodesUpdated.push(state.node.name);
				}
			}
		}

		if (otherNodesUpdated.length > 0) {
			nodeHelpers.updateNodesCredentialsIssues();
			toast.showMessage({
				title: i18n.baseText('nodeCredentials.showMessage.title'),
				message: i18n.baseText('nodeCredentials.autoAssigned.message', {
					interpolate: { count: String(otherNodesUpdated.length) },
				}),
				type: 'success',
			});
		}
	};

	const unsetCredential = (nodeName: string, credentialType: string): void => {
		const node = workflowsStore.getNodeByName(nodeName);
		if (!node) return;

		const updatedCredentials = { ...node.credentials };
		delete updatedCredentials[credentialType];

		workflowState.updateNodeProperties({
			name: nodeName,
			properties: {
				credentials: updatedCredentials,
			},
		});
		nodeHelpers.updateNodeCredentialIssuesByName(nodeName);
	};

	return {
		nodeSetupStates,
		totalCredentialsMissing,
		totalNodesRequiringSetup,
		isAllComplete,
		setCredential,
		unsetCredential,
	};
};
