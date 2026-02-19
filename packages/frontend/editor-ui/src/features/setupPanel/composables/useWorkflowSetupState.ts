import { computed, watch, type Ref } from 'vue';

import type { INodeUi } from '@/Interface';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import type { SetupCardItem } from '@/features/setupPanel/setupPanel.types';

import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	useCredentialsStore,
	listenForCredentialChanges,
} from '@/features/credentials/credentials.store';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { injectWorkflowState } from '@/app/composables/useWorkflowState';

import {
	getNodeCredentialTypes,
	groupCredentialsByType,
	isCredentialCardComplete,
	buildTriggerSetupState,
} from '@/features/setupPanel/setupPanel.utils';

import { sortNodesByExecutionOrder } from '@/app/utils/workflowUtils';

/**
 * Composable that manages workflow setup state for credential configuration.
 * Cards are grouped by credential type (one card per unique credential type)
 * with trigger nodes getting their own dedicated cards (test button only).
 * @param nodes Optional sub-set of nodes to check (defaults to full workflow)
 */
export const useWorkflowSetupState = (nodes?: Ref<INodeUi[]>) => {
	const workflowsStore = useWorkflowsStore();
	const credentialsStore = useCredentialsStore();
	const nodeTypesStore = useNodeTypesStore();
	const nodeHelpers = useNodeHelpers();
	const workflowState = injectWorkflowState();

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

		return sortNodesByExecutionOrder(
			nodesForSetup,
			workflowsStore.connectionsBySourceNode,
			workflowsStore.connectionsByDestinationNode,
		);
	});

	/**
	 * The name of the first (leftmost) trigger in the workflow.
	 * Only this trigger can be executed from setup cards; others are treated as regular nodes.
	 */
	const firstTriggerName = computed(() => {
		const first = nodesRequiringSetup.value.find(({ isTrigger }) => isTrigger);
		return first?.node.name ?? null;
	});

	/**
	 * All nodes that have credential requirements (includes both triggers and regular nodes).
	 * Sorted by X position.
	 */
	const nodesWithCredentials = computed(() =>
		nodesRequiringSetup.value.filter(({ credentialTypes }) => credentialTypes.length > 0),
	);

	/**
	 * Credential type states — one entry per unique credential type.
	 * Ordered by leftmost node X position (inherited from nodesWithCredentials iteration order).
	 * Cards with embedded triggers have isComplete recomputed to include trigger execution.
	 */
	const credentialTypeStates = computed(() => {
		const grouped = groupCredentialsByType(
			nodesWithCredentials.value.map(({ node, credentialTypes }) => ({
				node,
				credentialTypes,
			})),
			getCredentialDisplayName,
		);
		// Only the workflow's first trigger (leftmost) can be executed from setup cards.
		// It gets an embedded execute button and affects card completion.
		// Other triggers are treated as regular nodes (credentials only, no execute).
		const isTriggerNodeType = (nodeType: string) => nodeTypesStore.isTriggerNode(nodeType);
		return grouped.map((state) => {
			const embeddedTrigger = state.nodes.find(
				(node) => isTriggerNode(node) && node.name === firstTriggerName.value,
			);
			// For completion check, only consider the embedded (first) trigger
			const nodesForCompletion = embeddedTrigger
				? state.nodes.filter((node) => !isTriggerNode(node) || node === embeddedTrigger)
				: state.nodes.filter((node) => !isTriggerNode(node));
			return {
				...state,
				isComplete: isCredentialCardComplete(
					{ ...state, nodes: nodesForCompletion },
					hasTriggerExecutedSuccessfully,
					isTriggerNodeType,
					credentialsStore.isCredentialTestedOk,
				),
			};
		});
	});

	/**
	 * Trigger states — one entry per trigger node that is NOT covered by a credential card.
	 * Triggers with credentials are embedded into the credential card instead.
	 */
	const triggerStates = computed(() => {
		// Only the first trigger can get a standalone trigger card.
		// Check if it's already embedded in a credential card.
		if (!firstTriggerName.value) return [];

		const isFirstTriggerEmbedded = credentialTypeStates.value.some((credState) =>
			credState.nodes.some((node) => isTriggerNode(node) && node.name === firstTriggerName.value),
		);
		if (isFirstTriggerEmbedded) return [];

		return nodesRequiringSetup.value
			.filter(({ isTrigger, node }) => isTrigger && node.name === firstTriggerName.value)
			.map(({ node, credentialTypes }) =>
				buildTriggerSetupState(
					node,
					credentialTypes,
					credentialTypeStates.value,
					hasTriggerExecutedSuccessfully(node.name),
				),
			);
	});

	/**
	 * Ordered list of all setup cards, sorted by the position of each card's
	 * primary node (first node / trigger node) in the execution order.
	 */
	const setupCards = computed<SetupCardItem[]>(() => {
		const credentials: SetupCardItem[] = credentialTypeStates.value.map((state) => ({
			type: 'credential' as const,
			state,
		}));
		const triggers: SetupCardItem[] = triggerStates.value.map((state) => ({
			type: 'trigger' as const,
			state,
		}));

		const executionOrder = nodesRequiringSetup.value.map(({ node }) => node.name);
		const primaryNodeName = (card: SetupCardItem): string =>
			card.type === 'trigger' ? card.state.node.name : (card.state.nodes[0]?.name ?? '');

		return [...credentials, ...triggers].sort(
			(a, b) =>
				executionOrder.indexOf(primaryNodeName(a)) - executionOrder.indexOf(primaryNodeName(b)),
		);
	});

	const totalCredentialsMissing = computed(() => {
		return credentialTypeStates.value.filter((s) => !s.isComplete).length;
	});

	const totalCardsRequiringSetup = computed(() => {
		return setupCards.value.length;
	});

	const isAllComplete = computed(() => {
		return setupCards.value.length > 0 && setupCards.value.every((card) => card.state.isComplete);
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
	 * Sets a credential for all nodes that need the given credential type.
	 */
	const setCredential = (credentialType: string, credentialId: string): void => {
		const credential = credentialsStore.getCredentialById(credentialId);
		if (!credential) return;

		const credState = credentialTypeStates.value.find((s) => s.credentialType === credentialType);
		if (!credState) return;

		const credentialDetails = { id: credentialId, name: credential.name };

		void testCredentialInBackground(credentialId, credential.name, credentialType);

		for (const stateNode of credState.nodes) {
			const node = workflowsStore.getNodeByName(stateNode.name);
			if (!node) continue;

			workflowState.updateNodeProperties({
				name: stateNode.name,
				properties: {
					credentials: {
						...node.credentials,
						[credentialType]: credentialDetails,
					},
				},
			});
		}

		nodeHelpers.updateNodesCredentialsIssues();
	};

	/**
	 * Unsets a credential from all nodes that need the given credential type.
	 */
	const unsetCredential = (credentialType: string): void => {
		const credState = credentialTypeStates.value.find((s) => s.credentialType === credentialType);
		if (!credState) return;

		for (const stateNode of credState.nodes) {
			const node = workflowsStore.getNodeByName(stateNode.name);
			if (!node) continue;

			const updatedCredentials = { ...node.credentials };
			delete updatedCredentials[credentialType];

			workflowState.updateNodeProperties({
				name: stateNode.name,
				properties: {
					credentials: updatedCredentials,
				},
			});
		}

		nodeHelpers.updateNodesCredentialsIssues();
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
						unsetCredential(credType);
					}
				}
			}
		},
	});

	return {
		setupCards,
		credentialTypeStates,
		triggerStates,
		firstTriggerName,
		totalCredentialsMissing,
		totalCardsRequiringSetup,
		isAllComplete,
		setCredential,
		unsetCredential,
	};
};
