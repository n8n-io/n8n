import { computed, watch, type Ref } from 'vue';

import type { INodeUi } from '@/Interface';
import { type ICredentialDataDecryptedObject } from 'n8n-workflow';
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
	getNodeParametersIssues,
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
	 * Tracks node IDs that have been shown in setup cards at least once.
	 * Prevents cards from disappearing when nodes are temporarily valid.
	 */
	const seenNodes = new Set<string>();

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
				parameterIssues: getNodeParametersIssues(nodeTypesStore, node),
				isTrigger: isTriggerNode(node),
			}))
			.filter(
				({ credentialTypes, isTrigger, parameterIssues, node }) =>
					seenNodes.has(node.id) ||
					0 < credentialTypes.length + +isTrigger + Object.keys(parameterIssues).length,
			);

		// Never remove entries once we show them
		for (const { node } of nodesForSetup) {
			seenNodes.add(node.id);
		}
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

	const seenParameterNodes = new Set<string>();

	const nodesWithMissingParameters = computed(() => {
		const result = nodesRequiringSetup.value.filter(
			({ parameterIssues, node }) =>
				seenParameterNodes.has(node.id) || Object.keys(parameterIssues).length > 0,
		);

		for (const { node } of result) {
			seenParameterNodes.add(node.id);
		}

		return result;
	});

	/**
	 * Tracks node-credential combinations (format: "credType:nodeId") that have been shown at least once.
	 * Prevents cards from disappearing after parameters are filled.
	 */
	const seenNodeCredentials = new Set<string>();

	/**
	 * Tracks credential types that have ever had nodes with parameter issues.
	 * Once a credential type is tracked here, it's handled by nodeCredentialStates instead of credentialTypeStates.
	 * This prevents duplicate cards when parameters are filled but ensures the card persists.
	 */
	const seenCredentialTypesWithParameters = new Set<string>();

	/**
	 * Credential type states — one entry per unique credential type.
	 * Ordered by leftmost node X position (inherited from nodesWithCredentials iteration order).
	 * Cards with embedded triggers have isComplete recomputed to include trigger execution.
	 *
	 * NOTE: This now only includes credential types where NONE of the nodes have parameter issues.
	 * When nodes have both credentials and parameters, they're handled by nodeCredentialStates instead.
	 */
	const credentialTypeStates = computed(() => {
		// First, identify which credential types have ANY nodes with parameter issues
		const credentialTypesWithParameters = new Set<string>();
		for (const { credentialTypes, parameterIssues } of nodesRequiringSetup.value) {
			if (Object.keys(parameterIssues).length > 0) {
				for (const credType of credentialTypes) {
					credentialTypesWithParameters.add(credType);
				}
			}
		}

		// Only group credential types that have NO nodes with parameter issues
		// AND that have never been seen with parameters (to prevent duplication with nodeCredentialStates)
		const nodesWithoutParameters = nodesWithCredentials.value.filter(
			({ credentialTypes }) =>
				!credentialTypes.some(
					(credType) =>
						credentialTypesWithParameters.has(credType) ||
						seenCredentialTypesWithParameters.has(credType),
				),
		);

		const grouped = groupCredentialsByType(
			nodesWithoutParameters.map(({ node, credentialTypes }) => ({
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
	 * Parameter states for nodes with missing required parameters.
	 * Each state indicates:
	 * - Whether this is the first node of the given type in the workflow
	 * - Whether the node requires credentials
	 * Ordered by execution order (inherited from nodesWithMissingParameters).
	 *
	 * NOTE: This now only includes nodes that have parameter issues but NO credentials.
	 * Nodes with both are handled by nodeCredentialStates instead.
	 */
	const parameterStates = computed(() => {
		const seenNodeTypes = new Set<string>();

		// Only include nodes with parameters but NO credentials
		return nodesWithMissingParameters.value
			.filter(({ credentialTypes }) => credentialTypes.length === 0)
			.map((state) => {
				const { node, parameterIssues, credentialTypes, isTrigger } = state;
				const isFirstOfType = !seenNodeTypes.has(node.type);
				seenNodeTypes.add(node.type);

				// A parameter card is complete when there are no parameter issues
				const isComplete = Object.keys(parameterIssues).length === 0;

				return {
					node,
					parameterIssues,
					credentialTypes,
					isTrigger,
					isFirstOfType,
					isComplete,
				};
			});
	});

	/**
	 * Node credential states — combines credentials and parameters for nodes that have both.
	 * When ANY node using a credential type has parameter issues, we split into separate cards per node.
	 * Only nodes that actually have parameters are shown (nodes without parameters will get credentials automatically).
	 * Only the first node with each credential type shows the credential picker.
	 */
	const nodeCredentialStates = computed(() => {
		// Identify which credential types have ANY nodes with parameter issues (or had in the past)
		const credentialTypesWithParameters = new Set<string>();
		for (const { credentialTypes, parameterIssues } of nodesRequiringSetup.value) {
			if (Object.keys(parameterIssues).length > 0) {
				for (const credType of credentialTypes) {
					credentialTypesWithParameters.add(credType);
					seenCredentialTypesWithParameters.add(credType); // Remember this credential type
				}
			}
		}

		// Build two maps:
		// 1. All nodes using each credential type (for "Used in X nodes" hint)
		// 2. Nodes with parameters for each credential type (for actual cards)
		const credTypeToAllNodes = new Map<string, INodeUi[]>();
		const credTypeToNodesWithParams = new Map<
			string,
			Array<{
				node: INodeUi;
				credentialTypes: string[];
				parameterIssues: Record<string, string[]>;
				isTrigger: boolean;
			}>
		>();

		for (const entry of nodesRequiringSetup.value) {
			const { node, credentialTypes, parameterIssues } = entry;
			if (credentialTypes.length === 0) continue;

			for (const credType of credentialTypes) {
				// Include if currently has parameters OR was previously tracked
				if (
					!credentialTypesWithParameters.has(credType) &&
					!seenCredentialTypesWithParameters.has(credType)
				)
					continue;

				// Track all nodes using this credential type
				if (!credTypeToAllNodes.has(credType)) {
					credTypeToAllNodes.set(credType, []);
				}
				if (!credTypeToAllNodes.get(credType)!.some((n) => n.id === node.id)) {
					credTypeToAllNodes.get(credType)!.push(node);
				}

				// Track nodes with parameters OR nodes we've already shown (to prevent disappearing)
				const combinationKey = `${credType}:${node.id}`;
				const hasParameters = Object.keys(parameterIssues).length > 0;
				const alreadySeen = seenNodeCredentials.has(combinationKey);

				if (hasParameters || alreadySeen) {
					if (!credTypeToNodesWithParams.has(credType)) {
						credTypeToNodesWithParams.set(credType, []);
					}
					credTypeToNodesWithParams.get(credType)!.push(entry);
				}
			}
		}

		const result = [];
		const seenCombinations = new Set<string>();

		for (const [credType, entries] of credTypeToNodesWithParams) {
			let isFirstNode = true;
			const allNodesUsingCredential = credTypeToAllNodes.get(credType) ?? [];

			for (const entry of entries) {
				const { node, parameterIssues, isTrigger } = entry;
				const combinationKey = `${credType}:${node.id}`;

				// Skip duplicates (same node might appear if it has multiple credential types)
				if (seenCombinations.has(combinationKey)) continue;
				seenCombinations.add(combinationKey);

				// Mark this combination as seen so it persists even after parameters are filled
				seenNodeCredentials.add(combinationKey);

				// Get the selected credential ID for this node
				const credValue = node.credentials?.[credType];
				const selectedCredentialId =
					typeof credValue === 'string' ? undefined : (credValue?.id ?? undefined);

				// Get credential issues for this node
				const credentialIssues = node.issues?.credentials ?? {};
				const issues = credentialIssues[credType];
				const issueMessages = [issues ?? []].flat();

				// Determine if this should show the credential picker:
				// - Only the first node with this credential type shows the picker
				// - Other nodes with parameters don't show it (credential is shared)
				const showCredentialPicker = isFirstNode;

				// Check if credential is complete
				const credentialComplete = !!selectedCredentialId && issueMessages.length === 0;
				const testPassed =
					!selectedCredentialId || credentialsStore.isCredentialTestedOk(selectedCredentialId);

				// Check if trigger has executed (if applicable)
				const isTriggerNodeType = (nodeType: string) => nodeTypesStore.isTriggerNode(nodeType);
				const triggerComplete =
					!isTriggerNodeType(node.type) ||
					node.name !== firstTriggerName.value ||
					hasTriggerExecutedSuccessfully(node.name);

				// Card is complete when:
				// - Credential is set and tested (if applicable)
				// - No parameter issues
				// - Trigger has executed (if applicable)
				const isComplete =
					credentialComplete &&
					testPassed &&
					Object.keys(parameterIssues).length === 0 &&
					triggerComplete;

				result.push({
					node,
					credentialType: credType,
					credentialDisplayName: getCredentialDisplayName(credType),
					selectedCredentialId,
					issues: issueMessages,
					parameterIssues,
					isTrigger,
					isFirstNodeWithCredential: isFirstNode,
					showCredentialPicker,
					isComplete,
					allNodesUsingCredential,
				});

				isFirstNode = false;
			}
		}

		return result;
	});

	/**
	 * Cleanup: Remove tracking data for nodes that no longer exist in the workflow.
	 * Prevents memory leaks in long-running sessions with many workflow changes.
	 */
	watch(
		sourceNodes,
		(currentNodes) => {
			const currentNodeIds = new Set(currentNodes.map((n) => n.id));

			// Clean up seenNodes for removed nodes
			for (const nodeId of seenNodes) {
				if (!currentNodeIds.has(nodeId)) {
					seenNodes.delete(nodeId);
				}
			}

			// Clean up seenParameterNodes for removed nodes
			for (const nodeId of seenParameterNodes) {
				if (!currentNodeIds.has(nodeId)) {
					seenParameterNodes.delete(nodeId);
				}
			}

			// Clean up seenNodeCredentials for removed nodes
			// Format is "credType:nodeId", so extract nodeId and check if it exists
			for (const key of seenNodeCredentials) {
				const [, nodeId] = key.split(':');
				if (nodeId && !currentNodeIds.has(nodeId)) {
					seenNodeCredentials.delete(key);
				}
			}
		},
		{ deep: true },
	);

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
		const parameters: SetupCardItem[] = parameterStates.value.map((state) => ({
			type: 'parameter' as const,
			state,
		}));
		const nodeCredentials: SetupCardItem[] = nodeCredentialStates.value.map((state) => ({
			type: 'nodeCredential' as const,
			state,
		}));

		const executionOrder = nodesRequiringSetup.value.map(({ node }) => node.name);
		const primaryNodeName = (card: SetupCardItem): string => {
			if (card.type === 'trigger' || card.type === 'parameter' || card.type === 'nodeCredential') {
				return card.state.node.name;
			}
			return card.state.nodes[0]?.name ?? '';
		};

		return [...credentials, ...triggers, ...parameters, ...nodeCredentials].sort(
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
	 * Sets a credential for nodes.
	 * When nodeName is provided, sets it only for that specific node (for nodeCredential cards).
	 * Otherwise, sets it for all nodes that need the given credential type (for credential cards).
	 */
	const setCredential = (credentialType: string, credentialId: string, nodeName?: string): void => {
		const credential = credentialsStore.getCredentialById(credentialId);
		if (!credential) return;

		const credentialDetails = { id: credentialId, name: credential.name };

		void testCredentialInBackground(credentialId, credential.name, credentialType);

		// If nodeName is specified, set credential only for that node
		if (nodeName) {
			const node = workflowsStore.getNodeByName(nodeName);
			if (!node) return;

			workflowState.updateNodeProperties({
				name: nodeName,
				properties: {
					credentials: {
						...node.credentials,
						[credentialType]: credentialDetails,
					},
				},
			});
		} else {
			// Otherwise, set for all nodes with this credential type
			const credState = credentialTypeStates.value.find((s) => s.credentialType === credentialType);
			if (!credState) return;

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
		}

		nodeHelpers.updateNodesCredentialsIssues();
	};

	/**
	 * Unsets a credential from nodes.
	 * When nodeName is provided, unsets it only for that specific node (for nodeCredential cards).
	 * Otherwise, unsets it for all nodes that need the given credential type (for credential cards).
	 */
	const unsetCredential = (credentialType: string, nodeName?: string): void => {
		// If nodeName is specified, unset credential only for that node
		if (nodeName) {
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
		} else {
			// Otherwise, unset for all nodes with this credential type
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
		parameterStates,
		nodeCredentialStates,
		firstTriggerName,
		totalCredentialsMissing,
		totalCardsRequiringSetup,
		isAllComplete,
		nodesWithMissingParameters,
		setCredential,
		unsetCredential,
	};
};
