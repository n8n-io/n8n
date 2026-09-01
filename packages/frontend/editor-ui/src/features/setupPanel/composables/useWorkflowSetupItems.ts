import { computed, toValue, type MaybeRefOrGetter } from 'vue';

import type { InstanceAiSetupItem } from '@n8n/api-types';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import {
	getNodeCredentialTypes,
	getNodeParametersIssues,
} from '@/features/setupPanel/setupPanel.utils';

/**
 * Derives service-keyed setup items (`InstanceAiSetupItem`) for a workflow
 * from its document store. Unlike `useWorkflowSetupState` (the canvas setup
 * wizard), it takes an explicit workflowId instead of the editor's injected
 * document store, holds no UI state (no sticky cards, no auto-apply, no
 * background credential tests), and derives done-ness on demand so
 * out-of-band changes — e.g. a credential created from the credentials
 * page — reflect immediately.
 */
export function useWorkflowSetupItems(workflowId: MaybeRefOrGetter<string | undefined>) {
	const nodeTypesStore = useNodeTypesStore();
	const credentialsStore = useCredentialsStore();

	const documentStore = computed(() => {
		const id = toValue(workflowId);
		return id ? useWorkflowDocumentStore(createWorkflowDocumentId(id)) : undefined;
	});

	/** The document store only has content once a canvas host hydrated it. */
	const isWorkflowAvailable = computed(() => documentStore.value?.hydrated === true);

	const nodesRequiringSetup = computed(() => {
		const docStore = documentStore.value;
		if (!docStore?.hydrated) return [];
		return docStore.allNodes
			.filter((node) => !node.disabled)
			.map((node) => ({
				node,
				credentialTypes: getNodeCredentialTypes(nodeTypesStore, node),
				parameterIssues: getNodeParametersIssues(nodeTypesStore, node),
			}))
			.filter(
				({ credentialTypes, parameterIssues }) =>
					credentialTypes.length > 0 || Object.keys(parameterIssues).length > 0,
			);
	});

	/**
	 * Items keyed like the agent's durable `setup-items` events
	 * (`${workflowId}:${kind}:${key}`), so event rows and derived rows
	 * reconcile to the same identity. Credential items are per credential
	 * type, fanned out to the nodes using it via `nodeBindings`.
	 */
	const derivedItems = computed<InstanceAiSetupItem[]>(() => {
		const id = toValue(workflowId);
		if (!id || !isWorkflowAvailable.value) return [];

		const items: InstanceAiSetupItem[] = [];

		const bindingsByCredentialType = new Map<string, Array<{ nodeName: string }>>();
		for (const { node, credentialTypes } of nodesRequiringSetup.value) {
			for (const credentialType of credentialTypes) {
				const bindings = bindingsByCredentialType.get(credentialType) ?? [];
				bindings.push({ nodeName: node.name });
				bindingsByCredentialType.set(credentialType, bindings);
			}
		}
		for (const [credentialType, nodeBindings] of bindingsByCredentialType) {
			items.push({
				id: `${id}:credential:${credentialType}`,
				workflowId: id,
				kind: 'credential',
				credentialType,
				appDisplayName: credentialsStore.getCredentialTypeByName(credentialType)?.displayName,
				nodeBindings,
			});
		}

		for (const { node, parameterIssues } of nodesRequiringSetup.value) {
			const parameterNames = Object.keys(parameterIssues);
			if (parameterNames.length === 0) continue;
			items.push({
				id: `${id}:parameters:${node.name}`,
				workflowId: id,
				kind: 'parameters',
				nodeName: node.name,
				parameterNames,
			});
		}

		return items;
	});

	/** Whether every node bound to the item already carries a credential of its type. */
	function isCredentialBoundOnAllNodes(
		item: Extract<InstanceAiSetupItem, { kind: 'credential' }>,
	): boolean {
		const docStore = documentStore.value;
		if (!docStore?.hydrated) return false;
		const nodeNames = (item.nodeBindings ?? []).map((binding) => binding.nodeName);
		if (nodeNames.length === 0) return false;
		return nodeNames.every((nodeName) => {
			const assigned = docStore.getNodeByName(nodeName)?.credentials?.[item.credentialType];
			return typeof assigned === 'string' ? assigned.length > 0 : Boolean(assigned?.id);
		});
	}

	/**
	 * Done-ness is always derived, never stored (see `setupItemSchema`): a
	 * credential item is done once a usable credential of its type exists —
	 * binding it to the node is the apply path's job — or when every bound
	 * node already carries one (covers credentials shared with the workflow
	 * but not usable by the current user). A parameters item is done once
	 * none of its parameters raise issues on the current workflow.
	 */
	function isItemDone(item: InstanceAiSetupItem): boolean {
		if (item.kind === 'credential') {
			if (credentialsStore.getUsableCredentialByType(item.credentialType).length > 0) return true;
			return isCredentialBoundOnAllNodes(item);
		}

		const docStore = documentStore.value;
		if (!docStore?.hydrated) return false;
		const node = docStore.getNodeByName(item.nodeName);
		if (!node) return false;
		const issues = getNodeParametersIssues(nodeTypesStore, node);
		return item.parameterNames.every((parameterName) => !(parameterName in issues));
	}

	return { isWorkflowAvailable, derivedItems, isItemDone };
}
