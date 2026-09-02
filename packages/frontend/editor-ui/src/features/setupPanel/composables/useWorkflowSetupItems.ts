import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';
import { getActivePinia } from 'pinia';

import { GENERIC_AUTH_CREDENTIAL_TYPES, type InstanceAiSetupItem } from '@n8n/api-types';
import type { INodeCredentialsDetails } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import {
	listenForCredentialChanges,
	useCredentialsStore,
} from '@/features/credentials/credentials.store';
import {
	createWorkflowDocumentId,
	getWorkflowDocumentStoreId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import {
	getNodeCredentialTypes,
	getNodeParametersIssues,
} from '@/features/setupPanel/setupPanel.utils';

/**
 * Whether a node's credential slot holds a binding. Legacy workflow JSON may
 * still carry a plain credential name, which `INodeCredentials`' value type
 * doesn't admit (`useNodeHelpers` hedges against the same case).
 */
function isBoundCredential(assigned: INodeCredentialsDetails | string | undefined): boolean {
	return typeof assigned === 'string' ? assigned.length > 0 : Boolean(assigned?.id);
}

/**
 * Derives service-keyed setup items (`InstanceAiSetupItem`) for a workflow.
 * Unlike `useWorkflowSetupState` (the canvas setup wizard), it takes an
 * explicit workflowId instead of the editor's injected document store, holds
 * no UI state (no auto-apply, no background credential tests), and derives
 * done-ness on demand so out-of-band changes — e.g. a credential created from
 * the credentials page — reflect immediately.
 *
 * Node state comes from the live document store while a canvas host has one
 * hydrated, and from the saved workflow (fetched here) otherwise, so the
 * derivation also works on a refreshed thread with no canvas mounted. Pass
 * `paused` while the agent is editing the workflow: fetching waits until the
 * edit settles, then refreshes both the workflow and the usable-credentials
 * slice.
 */
export function useWorkflowSetupItems(
	workflowId: MaybeRefOrGetter<string | undefined>,
	options: { paused?: MaybeRefOrGetter<boolean> } = {},
) {
	const nodeTypesStore = useNodeTypesStore();
	const credentialsStore = useCredentialsStore();
	const workflowsListStore = useWorkflowsListStore();

	/**
	 * The canvas host's live document store, resolved through pinia's state
	 * registry so a host dispose+recreate cycle (`disposeWorkflowDocumentStore`
	 * deletes the state entry, re-creation re-adds it) reactively swaps this to
	 * the live instance instead of pinning a disposed one. Never instantiates
	 * the (heavyweight) store itself — without a host, the fetched workflow
	 * below is the node source. The `in` check is what makes the swap reactive;
	 * the id prefix rules out prototype keys.
	 */
	const documentStore = computed(() => {
		const id = toValue(workflowId);
		const pinia = getActivePinia();
		if (!id || !pinia) return undefined;
		const storeId = getWorkflowDocumentStoreId(createWorkflowDocumentId(id));
		if (!(storeId in pinia.state.value)) return undefined;
		return useWorkflowDocumentStore(createWorkflowDocumentId(id));
	});

	/**
	 * The id whose saved workflow this composable fetched to completion. The
	 * workflows-list cache alone can't prove availability: list pages seed
	 * `workflowsById` entries with a `nodes: []` placeholder, which would read
	 * as an empty (but "available") workflow and suppress the event feed.
	 */
	const fetchedWorkflowId = ref<string>();

	// (Re)load the derivation's inputs while not paused, and again when an
	// agent edit settles or a canvas host's document store goes away: the
	// saved workflow for node state (skipped while a hydrated canvas store is
	// the source) and the usable-credentials slice scoped to this workflow
	// (see `isItemDone`). Failures stay silent by design — rows fall back to
	// the thread's event feed until a later pass succeeds.
	watch(
		() =>
			[
				toValue(workflowId),
				toValue(options.paused) === true,
				documentStore.value?.hydrated === true,
			] as const,
		([id, paused, hydrated]) => {
			if (!id || paused) return;
			void credentialsStore.fetchUsableCredentials({ workflowId: id }).catch(() => {});
			if (!hydrated) {
				void workflowsListStore
					.fetchWorkflow(id)
					.then(() => {
						if (toValue(workflowId) === id) fetchedWorkflowId.value = id;
					})
					.catch(() => {});
			}
		},
		{ immediate: true },
	);

	// The usable slice is only written by its fetch, so a credential created,
	// edited, or deleted elsewhere in the app (credential modal, credentials
	// page) would leave done-ness stale while this derivation stays mounted.
	listenForCredentialChanges({
		store: credentialsStore,
		onCredentialCreated: refreshUsableSlice,
		onCredentialUpdated: refreshUsableSlice,
		onCredentialDeleted: refreshUsableSlice,
	});

	function refreshUsableSlice() {
		void credentialsStore.refreshUsableCredentials().catch(() => {});
	}

	/** Live canvas nodes when a host hydrated a document store, else the saved workflow's. */
	const workflowNodes = computed<INodeUi[] | undefined>(() => {
		const docStore = documentStore.value;
		if (docStore?.hydrated) return docStore.allNodes;
		const id = toValue(workflowId);
		if (!id || fetchedWorkflowId.value !== id) return undefined;
		return workflowsListStore.workflowsById[id]?.nodes;
	});

	/** Node state is available from a hydrated canvas store or the fetched workflow. */
	const isWorkflowAvailable = computed(() => workflowNodes.value !== undefined);

	const nodesByName = computed(() => {
		const byName = new Map<string, INodeUi>();
		for (const node of workflowNodes.value ?? []) byName.set(node.name, node);
		return byName;
	});

	const nodesRequiringSetup = computed(() => {
		return (workflowNodes.value ?? [])
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
	 * Parameter rows this composable has seen raise issues, kept so resolving
	 * them renders a checked row instead of dropping it (credential rows get
	 * this for free — they derive from workflow structure, not issue state).
	 * Session-scoped memory, cleared when the target workflow changes.
	 */
	const settledParameterItems = new Map<
		string,
		Extract<InstanceAiSetupItem, { kind: 'parameters' }>
	>();
	watch(
		() => toValue(workflowId),
		() => {
			settledParameterItems.clear();
			fetchedWorkflowId.value = undefined;
		},
	);

	/**
	 * Items keyed like the agent's durable `setup-items` events
	 * (`${workflowId}:${kind}:${key}`), so event rows and derived rows
	 * reconcile to the same identity. Credential items are per credential
	 * type, fanned out to the nodes using it via `nodeBindings` — except
	 * generic auth types, where one credential of the type serves many
	 * services so nodes can't share a row (or a done state): those are one
	 * item per node, with the node name in the id.
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
			const appDisplayName = credentialsStore.getCredentialTypeByName(credentialType)?.displayName;
			if (GENERIC_AUTH_CREDENTIAL_TYPES.has(credentialType)) {
				for (const binding of nodeBindings) {
					items.push({
						id: `${id}:credential:${credentialType}:${binding.nodeName}`,
						kind: 'credential',
						credentialType,
						appDisplayName,
						nodeBindings: [binding],
					});
				}
				continue;
			}
			items.push({
				id: `${id}:credential:${credentialType}`,
				kind: 'credential',
				credentialType,
				appDisplayName,
				nodeBindings,
			});
		}

		for (const { node, parameterIssues } of nodesRequiringSetup.value) {
			const parameterNames = Object.keys(parameterIssues);
			if (parameterNames.length === 0) continue;
			const item = {
				id: `${id}:parameters:${node.name}`,
				kind: 'parameters' as const,
				nodeName: node.name,
				parameterNames,
			};
			// Remembering inside the computed is safe: the write is idempotent
			// and the map is only ever read further down in the same pass.
			settledParameterItems.set(item.id, item);
			items.push(item);
		}
		// Re-list once-required parameter rows whose issues resolved (they now
		// render as done). Rows whose node is gone or disabled no longer apply.
		// The map only holds the current workflow's rows: it is cleared on id change.
		for (const item of settledParameterItems.values()) {
			if (items.some((existing) => existing.id === item.id)) continue;
			const node = nodesByName.value.get(item.nodeName);
			if (!node || node.disabled) continue;
			items.push(item);
		}

		return items;
	});

	/** Whether every node bound to the item already carries a credential of its type. */
	function isCredentialBoundOnAllNodes(
		item: Extract<InstanceAiSetupItem, { kind: 'credential' }>,
	): boolean {
		const nodeNames = (item.nodeBindings ?? []).map((binding) => binding.nodeName);
		if (nodeNames.length === 0) return false;
		return nodeNames.every((nodeName) =>
			isBoundCredential(nodesByName.value.get(nodeName)?.credentials?.[item.credentialType]),
		);
	}

	/** The usable-credentials slice only answers for this workflow once fetched for it. */
	const isUsableSliceCurrent = computed(() => {
		const id = toValue(workflowId);
		return id !== undefined && credentialsStore.hasUsableCredentialsForScope({ workflowId: id });
	});

	/**
	 * Done-ness is always derived, never stored (see `setupItemSchema`): a
	 * credential item is done once a usable credential of its type exists —
	 * binding it to the node is the apply path's job — or when every bound
	 * node already carries one (covers credentials shared with the workflow
	 * but not usable by the current user). The type-level shortcut only counts
	 * when the usable slice was fetched for this workflow (it is a single,
	 * last-writer-wins scope slice) and never for generic auth types, where a
	 * credential of the type says nothing about this service
	 * (`shouldAutoResolveCredential` draws the same line). A parameters item
	 * is done once none of its parameters raise issues on the current
	 * workflow.
	 */
	function isItemDone(item: InstanceAiSetupItem): boolean {
		if (item.kind === 'credential') {
			if (
				!GENERIC_AUTH_CREDENTIAL_TYPES.has(item.credentialType) &&
				isUsableSliceCurrent.value &&
				credentialsStore.getUsableCredentialByType(item.credentialType).length > 0
			) {
				return true;
			}
			return isCredentialBoundOnAllNodes(item);
		}

		const node = nodesByName.value.get(item.nodeName);
		if (!node) return false;
		const issues = getNodeParametersIssues(nodeTypesStore, node);
		return item.parameterNames.every((parameterName) => !Object.hasOwn(issues, parameterName));
	}

	return { isWorkflowAvailable, derivedItems, isItemDone };
}
