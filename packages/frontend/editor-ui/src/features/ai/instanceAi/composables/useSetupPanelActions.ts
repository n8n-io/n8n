import { computed, ref, shallowReactive, toValue, watch, type MaybeRefOrGetter } from 'vue';
import isEqual from 'lodash/isEqual';

import {
	AI_GATEWAY_MANAGED_TAG,
	instanceAiSetupCredentialAppliedKey,
	instanceAiSetupCredentialSelectionKey,
	readPendingInstanceAiSetupCredentialSelections,
	type InstanceAiSetupCredentialSelection,
	type InstanceAiSetupItem,
} from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { NodeHelpers } from 'n8n-workflow';
import type { INodeCredentialsDetails, INodeParameters } from 'n8n-workflow';

import type { INodeUi, IWorkflowDb } from '@/Interface';
import { getWorkflow } from '@/app/api/workflows';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import type { NodeTypeProvider } from '@/app/utils/nodeTypes/nodeTypeTransforms';
import { getNodeCredentialTypes } from '@/features/setupPanel/setupPanel.utils';
import { GENERIC_AUTH_CREDENTIAL_TYPES } from '@n8n/api-types';
import {
	createWorkflowDocumentId,
	useExistingWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useInstanceAiStore } from '../instanceAi.store';
import { fetchThread, updateThreadMetadata } from '../instanceAi.memory.api';
import {
	applySetupParameterChanges,
	getSetupParameterChanges,
	getSetupParameterValue,
	mergeSetupParameterChanges,
	type SetupParameterChange,
} from '../setupPanelParameterChanges';

export type SetupCredentialItem = Extract<InstanceAiSetupItem, { kind: 'credential' }>;

export type SetupCredentialRef = INodeCredentialsDetails;

export function resolveSetupCredentialItem(
	item: SetupCredentialItem,
	nodes: INodeUi[],
	nodeTypeProvider: NodeTypeProvider,
): SetupCredentialItem {
	if (item.nodeBindings?.length || GENERIC_AUTH_CREDENTIAL_TYPES.has(item.credentialType))
		return item;
	return {
		...item,
		nodeBindings: nodes
			.filter(
				(node) =>
					!node.disabled &&
					getNodeCredentialTypes(nodeTypeProvider, node).includes(item.credentialType),
			)
			.map((node) => ({ nodeName: node.name })),
	};
}

export type SetupPanelApplyResult =
	/** The workflow PATCH landed. */
	| 'applied'
	/** Every target node already carries the value — no write needed. */
	| 'noop'
	/**
	 * The write's target vanished — node gone from the saved workflow, or the
	 * panel re-anchored to another workflow mid-write. Rows re-derive.
	 */
	| 'dropped'
	/** Two consecutive version conflicts — gave up, rows re-derive. */
	| 'conflict'
	| 'error'
	/** Saved selection waits for workflow nodes or for the agent to finish. */
	| 'queued';

interface CredentialBind {
	item: SetupCredentialItem;
	credential: SetupCredentialRef;
	selectionId: string;
}

interface ParameterApply {
	nodeName: string;
	changes: SetupParameterChange[];
}

export interface SetupParameterSubmission {
	nodeName: string;
	values: INodeParameters;
	baseline: INodeParameters;
}

interface NodesDelta {
	credentialBinds: CredentialBind[];
	parameterApplies: ParameterApply[];
}

/**
 * Pre-PATCH server values keyed by node name, snapshotted before
 * `applyDeltaToNodes` mutates the fetched nodes. The mirror compares against
 * these to tell a newer unsaved local edit from plain server state.
 */
type NodesBaseline = Map<string, Pick<INodeUi, 'credentials' | 'parameters'>>;

/**
 * Re-applies the delta onto freshly fetched nodes. Mutates the given array's
 * nodes in place (the caller owns a per-request fetch result).
 */
function applyDeltaToNodes(nodes: INodeUi[], delta: NodesDelta): 'changed' | 'noop' | 'dropped' {
	const nodesByName = new Map(nodes.map((node) => [node.name, node]));
	let changed = false;
	let sawTarget = false;

	for (const { item, credential } of delta.credentialBinds) {
		for (const binding of item.nodeBindings ?? []) {
			const node = nodesByName.get(binding.nodeName);
			if (!node) continue;
			sawTarget = true;
			const current = node.credentials?.[item.credentialType];
			// Legacy workflow JSON may carry a plain credential name; the bind
			// overwrites it with a proper { id, name } reference.
			if (
				typeof current !== 'string' &&
				current?.id === credential.id &&
				(current?.__aiGatewayManaged === true) === (credential.__aiGatewayManaged === true)
			) {
				continue;
			}
			node.credentials = { ...node.credentials, [item.credentialType]: { ...credential } };
			changed = true;
		}
	}

	for (const { nodeName, changes } of delta.parameterApplies) {
		if (changes.length === 0) continue;
		const node = nodesByName.get(nodeName);
		if (!node) continue;
		sawTarget = true;
		const parameters = applySetupParameterChanges(node.parameters, changes);
		if (isEqual(parameters, node.parameters)) continue;
		node.parameters = parameters;
		changed = true;
	}

	if (changed) return 'changed';
	return sawTarget ? 'noop' : 'dropped';
}

/** Save credential choices before applying setup values through a guarded workflow PATCH. */
export function useSetupPanelActions(options: {
	threadId: string;
	/** The thread's active artifact workflow — same source as `useSetupPanelState`. */
	workflowId: MaybeRefOrGetter<string | undefined>;
	isAgentBuilding: MaybeRefOrGetter<boolean>;
	/** Retry early selections when a saved workflow gains nodes. */
	savedWorkflowChecksum?: MaybeRefOrGetter<string | undefined>;
	/**
	 * Receives the outcome of the automatic settle flush (queued writes
	 * draining when the agent lock releases) — the one apply path with no
	 * caller to return to. Manual `flushPendingApplies` calls report through
	 * their return value instead.
	 */
	onFlushResult?: (result: SetupPanelApplyResult, workflowId: string) => void;
	onSaved?: (workflow: IWorkflowDb) => void;
}) {
	const rootStore = useRootStore();
	const workflowsStore = useWorkflowsStore();
	const nodeTypesStore = useNodeTypesStore();
	const nodeHelpers = useNodeHelpers();
	const instanceAiStore = useInstanceAiStore();
	const credentialsStore = useCredentialsStore();

	const activeApplyCount = ref(0);
	const isApplying = computed(() => activeApplyCount.value > 0);
	const pendingCredentialBinds = shallowReactive(new Map<string, CredentialBind>());
	const credentialSaves = new Map<string, Promise<void>>();
	const pendingParameterApplies = shallowReactive(new Map<string, SetupParameterChange[]>());
	const applyingDeltas = shallowReactive(new Map<NodesDelta, string>());
	const savedCredentialBinds = computed(() => {
		const workflowId = toValue(options.workflowId);
		if (!workflowId) return [];
		return readPendingInstanceAiSetupCredentialSelections(
			instanceAiStore.getThreadMetadata(options.threadId),
			workflowId,
		).map(({ itemId, selection }): CredentialBind => {
			const cached = pendingCredentialBinds.get(itemId);
			if (cached?.selectionId === selection.selectionId) return cached;
			const credential =
				credentialsStore.getUsableCredentialById(selection.credentialId) ??
				credentialsStore.getCredentialById(selection.credentialId);
			return {
				item: {
					id: itemId,
					kind: 'credential',
					credentialType: selection.credentialType,
					nodeBindings: selection.nodeNames?.map((nodeName) => ({ nodeName })),
				},
				credential:
					selection.credentialId === AI_GATEWAY_MANAGED_TAG
						? { id: null, name: '', __aiGatewayManaged: true }
						: { id: selection.credentialId, name: credential?.name ?? '' },
				selectionId: selection.selectionId,
			};
		});
	});

	async function persistMetadata(metadata: Record<string, unknown>) {
		await updateThreadMetadata(rootStore.restApiContext, options.threadId, metadata);
		instanceAiStore.setThreadMetadata(options.threadId, {
			...instanceAiStore.getThreadMetadata(options.threadId),
			...metadata,
		});
	}

	async function markCredentialsApplied(delta: NodesDelta) {
		if (delta.credentialBinds.length === 0) return;
		await persistMetadata(
			Object.fromEntries(
				delta.credentialBinds.map(({ item, selectionId }) => [
					instanceAiSetupCredentialAppliedKey(item.id, selectionId),
					true,
				]),
			),
		);
		for (const { item, selectionId } of delta.credentialBinds) {
			if (pendingCredentialBinds.get(item.id)?.selectionId === selectionId)
				pendingCredentialBinds.delete(item.id);
		}
	}
	/** Parameter drafts belong to the workflow that queued them. */
	let queuedWorkflowId: string | undefined;

	/** Queued writes awaiting the agent lock release. */
	const pendingApplyCount = computed(
		() => savedCredentialBinds.value.length + pendingParameterApplies.size,
	);

	function getPendingCredential(itemId: string, nodeName?: string): SetupCredentialRef | undefined {
		const workflowId = toValue(options.workflowId);
		const scopedId = nodeName ? `${itemId}:${nodeName}` : itemId;
		const queued =
			savedCredentialBinds.value.find(({ item }) => item.id === scopedId) ??
			savedCredentialBinds.value.find(({ item }) => item.id === itemId);
		if (queued) return queued.credential;
		for (const [delta, targetId] of [...applyingDeltas].reverse()) {
			if (targetId !== workflowId) continue;
			const bind =
				delta.credentialBinds.find(({ item }) => item.id === scopedId) ??
				delta.credentialBinds.find(({ item }) => item.id === itemId);
			if (bind) return bind.credential;
		}
		return undefined;
	}

	function getPendingParameterChanges(nodeName: string): SetupParameterChange[] {
		const workflowId = toValue(options.workflowId);
		const queued = pendingParameterApplies.get(nodeName) ?? [];
		let changes: SetupParameterChange[] = [];
		for (const [delta, targetId] of applyingDeltas) {
			if (targetId !== workflowId) continue;
			for (const apply of delta.parameterApplies) {
				if (apply.nodeName === nodeName)
					changes = mergeSetupParameterChanges(changes, apply.changes);
			}
		}
		return mergeSetupParameterChanges(changes, queuedWorkflowId === workflowId ? queued : []);
	}

	/** Puts a delta back into the queues, keeping any newer entries queued meanwhile. */
	function requeueDelta(workflowId: string, delta: NodesDelta) {
		if (toValue(options.workflowId) !== workflowId) return;
		queuedWorkflowId = workflowId;
		for (const bind of delta.credentialBinds) {
			if (!pendingCredentialBinds.has(bind.item.id)) {
				pendingCredentialBinds.set(bind.item.id, bind);
			}
		}
		for (const { nodeName, changes } of delta.parameterApplies) {
			const existing = pendingParameterApplies.get(nodeName) ?? [];
			pendingParameterApplies.set(nodeName, mergeSetupParameterChanges(changes, existing));
		}
	}

	/**
	 * Mirrors an applied delta into a live canvas document, if a host has one
	 * hydrated: the derivation reads the document's nodes while it exists, and
	 * the document's next save would otherwise clobber the bind (its nodes) or
	 * version-conflict (its stale versionId/checksum).
	 *
	 * The delta merges into the document's own nodes (not the server copy) so
	 * unsaved local edits survive. That includes the field the delta itself
	 * wrote: a document value that already diverged from the pre-PATCH server
	 * value is a newer local edit — it stays, and wins on the document's next
	 * save. Mirror writes carry already-saved state, so they do not mark the
	 * editor dirty, and the touched nodes' issues are recomputed so stale
	 * warnings clear right away.
	 */
	function syncHydratedDocument(
		workflowId: string,
		delta: NodesDelta,
		baseline: NodesBaseline,
		updated: IWorkflowDb,
	) {
		const documentStore = useExistingWorkflowDocumentStore(createWorkflowDocumentId(workflowId));
		if (!documentStore?.hydrated) return;

		// Only mirror nodes the PATCH actually landed on.
		const updatedNodeNames = new Set(updated.nodes.map((node) => node.name));
		const touchedNodeNames = new Set<string>();
		for (const { item, credential } of delta.credentialBinds) {
			for (const binding of item.nodeBindings ?? []) {
				if (!updatedNodeNames.has(binding.nodeName)) continue;
				const docNode = documentStore.getNodeByName(binding.nodeName);
				if (!docNode) continue;
				const base = baseline.get(binding.nodeName);
				const current = docNode.credentials?.[item.credentialType];
				if (!isEqual(current, base?.credentials?.[item.credentialType])) continue;
				documentStore.updateNodeProperties(
					{
						name: binding.nodeName,
						properties: {
							credentials: { ...docNode.credentials, [item.credentialType]: { ...credential } },
						},
					},
					{ markDirty: false },
				);
				touchedNodeNames.add(binding.nodeName);
			}
		}
		for (const { nodeName, changes } of delta.parameterApplies) {
			if (!updatedNodeNames.has(nodeName)) continue;
			const docNode = documentStore.getNodeByName(nodeName);
			if (!docNode) continue;
			const base = baseline.get(nodeName);
			// Keep newer local edits to the same field.
			const mirrorChanges = changes.filter((change) =>
				isEqual(
					getSetupParameterValue(docNode.parameters, change.path),
					getSetupParameterValue(base?.parameters ?? {}, change.path),
				),
			);
			if (mirrorChanges.length === 0) continue;
			documentStore.updateNodeProperties(
				{
					name: nodeName,
					properties: { parameters: applySetupParameterChanges(docNode.parameters, mirrorChanges) },
				},
				{ markDirty: false },
			);
			touchedNodeNames.add(nodeName);
		}

		// The mirror bypasses the canvas editing paths, so nothing else
		// re-derives node issues. Recompute them the way the canvas does, but
		// against this document (useNodeHelpers writes to its injected one).
		for (const nodeName of touchedNodeNames) {
			const node = documentStore.getNodeByName(nodeName);
			if (!node) continue;
			documentStore.setNodeIssue({
				node: nodeName,
				type: 'credentials',
				value: nodeHelpers.getNodeCredentialIssues(node)?.credentials ?? null,
			});
			const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
			if (!nodeType) continue;
			documentStore.setNodeIssue({
				node: nodeName,
				type: 'parameters',
				value:
					NodeHelpers.getNodeParametersIssues(nodeType.properties, node, nodeType)?.parameters ??
					null,
			});
			// Applied parameters can change the node's dynamic inputs.
			const workflowObject = documentStore.getWorkflowObjectAccessorSnapshot();
			documentStore.setNodeIssue({
				node: nodeName,
				type: 'input',
				value: nodeHelpers.getNodeInputIssues(workflowObject, node, nodeType)?.input ?? null,
			});
		}

		documentStore.setVersionData({
			versionId: updated.versionId,
			name: documentStore.versionData?.name ?? null,
			description: documentStore.versionData?.description ?? null,
		});
		if (updated.checksum) documentStore.setChecksum(updated.checksum);
	}

	/**
	 * The guarded write: fetch the saved workflow, re-apply the delta onto its
	 * nodes, PATCH with the fetched versionId + checksum. A version conflict
	 * (another writer landed in between) refetches, re-applies and retries
	 * once; a second conflict gives up.
	 */
	async function patchWorkflowNodes(
		workflowId: string,
		delta: NodesDelta,
	): Promise<SetupPanelApplyResult> {
		activeApplyCount.value++;
		applyingDeltas.set(delta, workflowId);
		try {
			if (delta.credentialBinds.length > 0) {
				const before = instanceAiStore.getThreadMetadata(options.threadId);
				const { thread } = await fetchThread(rootStore.restApiContext, options.threadId);
				const current = instanceAiStore.getThreadMetadata(options.threadId);
				// Keep choices saved locally while the server read was in flight.
				instanceAiStore.setThreadMetadata(options.threadId, {
					...current,
					...Object.fromEntries(
						Object.entries(thread.metadata ?? {}).filter(([key]) =>
							isEqual(before?.[key], current?.[key]),
						),
					),
				});
				const pendingIds = new Set(
					readPendingInstanceAiSetupCredentialSelections(
						instanceAiStore.getThreadMetadata(options.threadId),
						workflowId,
					).map(({ selection }) => selection.selectionId),
				);
				delta.credentialBinds = delta.credentialBinds.filter(({ selectionId }) =>
					pendingIds.has(selectionId),
				);
				if (delta.credentialBinds.length === 0 && delta.parameterApplies.length === 0)
					return 'noop';
			}
			for (let attempt = 0; attempt < 2; attempt++) {
				let fresh: IWorkflowDb;
				try {
					fresh = await getWorkflow(rootStore.restApiContext, workflowId);
				} catch {
					return 'error';
				}
				// Never write unguarded: without the checksum the backend skips
				// conflict detection and the PATCH could clobber a concurrent edit.
				if (!fresh.checksum) return 'error';

				const nodes = fresh.nodes;
				if (nodes.length === 0 && delta.credentialBinds.length > 0) return 'queued';
				// An early announcement can arrive before its workflow nodes exist.
				if (delta.credentialBinds.some((bind) => !bind.item.nodeBindings?.length)) {
					try {
						await nodeTypesStore.loadNodeTypesIfNotLoaded();
					} catch {
						return 'error';
					}
				}
				const resolvedDelta: NodesDelta = {
					...delta,
					credentialBinds: delta.credentialBinds.map((bind) => ({
						...bind,
						item: resolveSetupCredentialItem(bind.item, nodes, nodeTypesStore),
					})),
				};
				// applyDeltaToNodes mutates these nodes — snapshot the pre-PATCH
				// values first so the mirror can spot newer local edits.
				const baseline: NodesBaseline = new Map(
					nodes.map((node) => [
						node.name,
						{ credentials: { ...node.credentials }, parameters: { ...node.parameters } },
					]),
				);
				const outcome = applyDeltaToNodes(nodes, resolvedDelta);

				// The anchor and the agent lock can both move while the fetch was
				// awaited. A re-anchored panel no longer owns this write — drop it
				// (the same rule the queue watcher enforces). A re-acquired lock (a
				// new build starting is also what a 409 usually means) requeues it
				// instead: a user write must not land mid-build.
				if (toValue(options.workflowId) !== workflowId) return 'dropped';
				if (toValue(options.isAgentBuilding)) {
					requeueDelta(workflowId, delta);
					return 'queued';
				}
				if (outcome !== 'changed') {
					if (outcome === 'noop') options.onSaved?.(fresh);
					await markCredentialsApplied(delta);
					return outcome;
				}

				try {
					const updated = await workflowsStore.updateWorkflow(workflowId, {
						nodes,
						versionId: fresh.versionId,
						expectedChecksum: fresh.checksum,
					});
					syncHydratedDocument(workflowId, resolvedDelta, baseline, updated);
					options.onSaved?.(updated);
					await markCredentialsApplied(delta);
					return 'applied';
				} catch (error) {
					const isConflict = error instanceof ResponseError && error.httpStatusCode === 409;
					if (!isConflict) return 'error';
				}
			}
			return 'conflict';
		} catch {
			return 'error';
		} finally {
			applyingDeltas.delete(delta);
			activeApplyCount.value--;
		}
	}

	/**
	 * Binds a credential to every node the item covers. While the agent builds,
	 * the bind queues instead (latest wins per item) — this is also the
	 * mid-build create path: creating a credential registers its bind here and
	 * the flush lands it once the lock releases.
	 */
	async function bindCredential(
		item: SetupCredentialItem,
		credential: SetupCredentialRef,
	): Promise<SetupPanelApplyResult> {
		const workflowId = toValue(options.workflowId);
		if (!workflowId || !item.id.startsWith(`${workflowId}:credential:`)) return 'error';
		const selection: InstanceAiSetupCredentialSelection = {
			selectionId: crypto.randomUUID(),
			credentialType: item.credentialType,
			credentialId: credential.__aiGatewayManaged ? AI_GATEWAY_MANAGED_TAG : (credential.id ?? ''),
			nodeNames: item.nodeBindings?.length
				? item.nodeBindings.map(({ nodeName }) => nodeName)
				: undefined,
		};
		if (!selection.credentialId) return 'error';
		// Preserve selection order when consecutive metadata requests overlap.
		const save = (credentialSaves.get(item.id) ?? Promise.resolve())
			.catch(() => {})
			.then(
				async () =>
					await persistMetadata({ [instanceAiSetupCredentialSelectionKey(item.id)]: selection }),
			);
		credentialSaves.set(item.id, save);
		try {
			await save;
		} catch {
			return 'error';
		} finally {
			if (credentialSaves.get(item.id) === save) credentialSaves.delete(item.id);
		}
		const bind = { item, credential, selectionId: selection.selectionId };
		pendingCredentialBinds.set(item.id, bind);
		if (toValue(options.workflowId) !== workflowId) return 'queued';
		if (toValue(options.isAgentBuilding)) {
			return 'queued';
		}
		return await patchWorkflowNodes(workflowId, {
			credentialBinds: [bind],
			parameterApplies: [],
		});
	}

	/** Use a baseline to preserve unedited fields inside each submitted root. */
	async function applyParameterValues(
		nodeName: string,
		values: INodeParameters,
		baseline: INodeParameters = {},
	): Promise<SetupPanelApplyResult> {
		return await applyParameterBatch([{ nodeName, values, baseline }]);
	}

	/** Confirm all visible node fields in one guarded workflow update. */
	async function applyParameterBatch(
		submissions: SetupParameterSubmission[],
	): Promise<SetupPanelApplyResult> {
		const parameterApplies = submissions.map(({ nodeName, values, baseline }) => ({
			nodeName,
			changes: getSetupParameterChanges(baseline, { ...baseline, ...values }),
		}));
		if (toValue(options.isAgentBuilding)) {
			queuedWorkflowId = toValue(options.workflowId);
			for (const { nodeName, changes } of parameterApplies) {
				const existing = pendingParameterApplies.get(nodeName) ?? [];
				pendingParameterApplies.set(nodeName, mergeSetupParameterChanges(existing, changes));
			}
			return 'queued';
		}
		const workflowId = toValue(options.workflowId);
		if (!workflowId) return 'error';
		return await patchWorkflowNodes(workflowId, {
			credentialBinds: [],
			parameterApplies,
		});
	}

	/** Apply queued values after the agent finishes. Failed credential choices stay saved. */
	async function flushPendingApplies(): Promise<SetupPanelApplyResult | undefined> {
		// The lock rule holds for manual flushes too — the queue stays intact.
		if (toValue(options.isAgentBuilding)) return undefined;
		if (pendingApplyCount.value === 0) return undefined;
		const workflowId = toValue(options.workflowId);
		if (!workflowId || [...applyingDeltas.values()].includes(workflowId)) return undefined;
		if (workflowId !== queuedWorkflowId) {
			pendingParameterApplies.clear();
		}
		const delta: NodesDelta = {
			credentialBinds: savedCredentialBinds.value,
			parameterApplies: [...pendingParameterApplies.entries()].map(([nodeName, changes]) => ({
				nodeName,
				changes,
			})),
		};
		pendingParameterApplies.clear();
		return await patchWorkflowNodes(workflowId, delta);
	}

	watch(
		[
			() => toValue(options.workflowId),
			() => toValue(options.isAgentBuilding),
			() => toValue(options.savedWorkflowChecksum),
		],
		([workflowId, building]) => {
			if (!building && workflowId) {
				void flushPendingApplies().then((result) => {
					if (result) options.onFlushResult?.(result, workflowId);
				});
			}
		},
		{ immediate: true },
	);

	// Credential choices remain in thread metadata when the active workflow changes.
	watch(
		() => toValue(options.workflowId),
		() => {
			pendingCredentialBinds.clear();
			pendingParameterApplies.clear();
		},
	);

	return {
		bindCredential,
		applyParameterValues,
		applyParameterBatch,
		flushPendingApplies,
		pendingApplyCount,
		getPendingCredential,
		getPendingParameterChanges,
		isApplying,
	};
}
