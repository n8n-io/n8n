import { computed, type Ref } from 'vue';

import type { INodeUi } from '@/Interface';
import type { SetupCardItem } from '../setupPanel.types';

import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { injectWorkflowState } from '@/app/composables/useWorkflowState';

import {
	getNodeCredentialTypes,
	groupCredentialsByType,
	isCredentialCardComplete,
	buildTriggerSetupState,
} from '../setupPanel.utils';

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

	const isGenericAuthType = (credentialType: string): boolean => {
		const credentialTypeInfo = credentialsStore.getCredentialTypeByName(credentialType);
		return credentialTypeInfo?.genericAuth === true;
	};

	const isTriggerNode = (node: INodeUi): boolean => {
		return nodeTypesStore.isTriggerNode(node.type);
	};

	const hasTriggerExecutedSuccessfully = (nodeName: string): boolean => {
		const runData = workflowsStore.getWorkflowResultDataByNodeName(nodeName);
		return runData !== null && runData.length > 0;
	};

	/**
	 * All non-disabled nodes that either have credential requirements or are triggers.
	 * Sorted by X position (left-to-right on the canvas).
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

		return nodesForSetup.sort((a, b) => a.node.position[0] - b.node.position[0]);
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
			isGenericAuthType,
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
	 * Ordered list of all setup cards: credential-type cards first, then trigger cards.
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
		return [...credentials, ...triggers];
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
	 * Sets a credential for all nodes that need the given credential type.
	 */
	const setCredential = (credentialType: string, credentialId: string): void => {
		const credential = credentialsStore.getCredentialById(credentialId);
		if (!credential) return;

		const credState = credentialTypeStates.value.find((s) => s.credentialType === credentialType);
		if (!credState) return;

		const credentialDetails = { id: credentialId, name: credential.name };

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
