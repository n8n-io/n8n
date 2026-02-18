import { computed, watch, type Ref } from 'vue';

import type { INodeUi } from '@/Interface';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import type { NodeSetupState } from '../setupPanel.types';

import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	useCredentialsStore,
	listenForCredentialChanges,
} from '@/features/credentials/credentials.store';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { injectWorkflowState } from '@/app/composables/useWorkflowState';
import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';

import { getNodeCredentialTypes, buildNodeSetupState } from '../setupPanel.utils';
import { sortNodesByExecutionOrder } from '@/app/utils/workflowUtils';

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

	const isTriggerNode = (node: INodeUi): boolean => {
		return nodeTypesStore.isTriggerNode(node.type);
	};

	const hasTriggerExecutedSuccessfully = (nodeName: string): boolean => {
		const runData = workflowsStore.getWorkflowResultDataByNodeName(nodeName);
		return runData !== null && runData.length > 0;
	};

	/**
	 * Get nodes that require setup:
	 * - Nodes with credential requirements
	 * - Trigger nodes (regardless of credentials)
	 * Sorted by execution order (grouped by trigger, DFS through connections).
	 */
	const nodesRequiringSetup = computed(() => {
		const nodesForSetup = sourceNodes.value
			.filter((node) => !node.disabled)
			.map((node) => ({
				node,
				credentialTypes: getNodeCredentialTypes(nodeTypesStore, node),
				isTrigger: isTriggerNode(node),
			}))
			.filter(({ credentialTypes, isTrigger }) => credentialTypes.length > 0 || isTrigger);

		return sortNodesByExecutionOrder(nodesForSetup, workflowsStore.connectionsBySourceNode);
	});

	/**
	 * Map of credential type -> node names that require it (for shared credential awareness in UI)
	 */
	const credentialTypeToNodeNames = computed(() => {
		const map = new Map<string, string[]>();
		for (const { node, credentialTypes } of nodesRequiringSetup.value) {
			for (const credType of credentialTypes) {
				const existing = map.get(credType) ?? [];
				existing.push(node.name);
				map.set(credType, existing);
			}
		}
		return map;
	});

	/**
	 * Node setup states - one entry per node that requires setup.
	 * This data is used by cards component.
	 */
	const nodeSetupStates = computed<NodeSetupState[]>(() =>
		nodesRequiringSetup.value.map(({ node, credentialTypes, isTrigger }) =>
			buildNodeSetupState(
				node,
				credentialTypes,
				getCredentialDisplayName,
				credentialTypeToNodeNames.value,
				isTrigger,
				hasTriggerExecutedSuccessfully(node.name),
				credentialsStore.isCredentialTestedOk,
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
	 * Tests a saved credential in the background.
	 * Fetches the credential's redacted data first so the backend can unredact and test.
	 * Skips if the credential is already tested OK or has a test in flight.
	 * The result is tracked automatically in the credentials store as a side effect of testCredential.
	 */
	async function testCredentialInBackground(
		credentialId: string,
		credentialName: string,
		credentialType: string,
	) {
		if (
			credentialsStore.isCredentialTestedOk(credentialId) ||
			credentialsStore.isCredentialTestPending(credentialId)
		) {
			return;
		}

		try {
			const credentialResponse = await credentialsStore.getCredentialData({ id: credentialId });
			if (!credentialResponse?.data || typeof credentialResponse.data === 'string') {
				return;
			}

			// Re-check after the async fetch — another caller (e.g. CredentialEdit) may have
			// started or completed a test while we were fetching credential data.
			if (
				credentialsStore.isCredentialTestedOk(credentialId) ||
				credentialsStore.isCredentialTestPending(credentialId)
			) {
				return;
			}

			const { ownedBy, sharedWithProjects, oauthTokenData, ...data } = credentialResponse.data;

			// OAuth credentials can't be tested via the API — the presence of token data
			// means the OAuth flow completed successfully, which is the equivalent of a passing test.
			if (oauthTokenData) {
				credentialsStore.credentialTestResults.set(credentialId, 'success');
				return;
			}

			await credentialsStore.testCredential({
				id: credentialId,
				name: credentialName,
				type: credentialType,
				data: data as ICredentialDataDecryptedObject,
			});
		} catch {
			// Test failure is tracked in the store as a side effect
		}
	}

	/**
	 * Auto-test all pre-existing selected credentials on initial load.
	 * Runs once when nodes become available so checkmarks reflect actual validity.
	 * Deduplicates by credential ID so shared credentials are only tested once.
	 */
	let initialTestDone = false;
	watch(
		nodesRequiringSetup,
		(entries) => {
			if (initialTestDone || entries.length === 0) return;
			initialTestDone = true;

			const credentialsToTest = new Map<string, { name: string; type: string }>();
			for (const { node, credentialTypes } of entries) {
				for (const credType of credentialTypes) {
					const credValue = node.credentials?.[credType];
					const selectedId = typeof credValue === 'string' ? undefined : credValue?.id;
					if (!selectedId || credentialsToTest.has(selectedId)) continue;

					const cred = credentialsStore.getCredentialById(selectedId);
					if (!cred) continue;

					credentialsToTest.set(selectedId, { name: cred.name, type: credType });
				}
			}

			for (const [id, { name, type }] of credentialsToTest) {
				void testCredentialInBackground(id, name, type);
			}
		},
		{ immediate: true },
	);

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

		void testCredentialInBackground(credentialId, credential.name, credentialType);

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

	/**
	 * When a credential is deleted, unset it from ALL nodes that reference it.
	 * This is the symmetric counterpart to setCredential's auto-assignment.
	 */
	listenForCredentialChanges({
		store: credentialsStore,
		onCredentialDeleted: (deletedCredentialId) => {
			for (const { node, credentialTypes } of nodesRequiringSetup.value) {
				for (const credType of credentialTypes) {
					const credValue = node.credentials?.[credType];
					const selectedId = typeof credValue === 'string' ? undefined : credValue?.id;
					if (selectedId === deletedCredentialId) {
						unsetCredential(node.name, credType);
					}
				}
			}
		},
	});

	return {
		nodeSetupStates,
		totalCredentialsMissing,
		totalNodesRequiringSetup,
		isAllComplete,
		setCredential,
		unsetCredential,
	};
};
