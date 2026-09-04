import { computed, shallowReactive, toValue, watch, type MaybeRefOrGetter } from 'vue';
import isEqual from 'lodash/isEqual';

import type {
	InstanceAiAttachment,
	InstanceAiHandoffContext,
	InstanceAiSetupItem,
} from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { NodeHelpers } from 'n8n-workflow';
import type { INodeParameters } from 'n8n-workflow';

import type { INodeUi, IWorkflowDb } from '@/Interface';
import { getWorkflow } from '@/app/api/workflows';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import {
	createWorkflowDocumentId,
	useExistingWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';

export type SetupCredentialItem = Extract<InstanceAiSetupItem, { kind: 'credential' }>;

export interface SetupCredentialRef {
	id: string;
	name: string;
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
	/** Agent lock held — stashed, flushed when the build settles. */
	| 'queued';

/**
 * Thread surface the apply paths need. Structurally satisfied by
 * `useThread()`; kept narrow so tests can pass a plain stub.
 */
export interface SetupPanelThreadActions {
	sendMessage: (
		message: string,
		attachments?: InstanceAiAttachment[],
		pushRef?: string,
		handoffContext?: InstanceAiHandoffContext,
	) => Promise<boolean>;
}

interface CredentialBind {
	item: SetupCredentialItem;
	credential: SetupCredentialRef;
}

interface ParameterApply {
	nodeName: string;
	values: INodeParameters;
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
			if (typeof current !== 'string' && current?.id === credential.id) continue;
			node.credentials = { ...node.credentials, [item.credentialType]: { ...credential } };
			changed = true;
		}
	}

	for (const { nodeName, values } of delta.parameterApplies) {
		if (Object.keys(values).length === 0) continue;
		const node = nodesByName.get(nodeName);
		if (!node) continue;
		sawTarget = true;
		node.parameters = { ...node.parameters, ...values };
		changed = true;
	}

	if (changed) return 'changed';
	return sawTarget ? 'noop' : 'dropped';
}

/**
 * Setup panel apply paths (T6 of setup panel v2): bind credentials and submit
 * parameter values through the normal versionId/checksum-guarded workflow
 * PATCH, and send the synthesized Execute message through the normal chat
 * send endpoint.
 *
 * The agent lock rule: no user-initiated workflow write while the agent is
 * editing. Writes requested mid-build queue up (latest wins per item/node)
 * and flush once `isAgentBuilding` settles — one attempt, then the queue is
 * dropped and done-ness re-derives from the saved workflow.
 */
export function useSetupPanelActions(options: {
	thread: SetupPanelThreadActions;
	/** The thread's active artifact workflow — same source as `useSetupPanelState`. */
	workflowId: MaybeRefOrGetter<string | undefined>;
	isAgentBuilding: MaybeRefOrGetter<boolean>;
	/**
	 * Receives the outcome of the automatic settle flush (queued writes
	 * draining when the agent lock releases) — the one apply path with no
	 * caller to return to. Manual `flushPendingApplies` calls report through
	 * their return value instead.
	 */
	onFlushResult?: (result: SetupPanelApplyResult) => void;
}) {
	const i18n = useI18n();
	const rootStore = useRootStore();
	const workflowsStore = useWorkflowsStore();
	const nodeTypesStore = useNodeTypesStore();
	const nodeHelpers = useNodeHelpers();

	const pendingCredentialBinds = shallowReactive(new Map<string, CredentialBind>());
	const pendingParameterApplies = shallowReactive(new Map<string, INodeParameters>());
	/**
	 * The workflow the queued writes were captured for. A build settling and a
	 * re-anchor can land in the same flush (the settle watcher runs first), so
	 * the flush checks ownership instead of trusting the current anchor.
	 */
	let queuedWorkflowId: string | undefined;

	/** Queued writes awaiting the agent lock release. */
	const pendingApplyCount = computed(
		() => pendingCredentialBinds.size + pendingParameterApplies.size,
	);

	/** Puts a delta back into the queues, keeping any newer entries queued meanwhile. */
	function requeueDelta(workflowId: string, delta: NodesDelta) {
		if (toValue(options.workflowId) !== workflowId) return;
		queuedWorkflowId = workflowId;
		for (const bind of delta.credentialBinds) {
			if (!pendingCredentialBinds.has(bind.item.id)) {
				pendingCredentialBinds.set(bind.item.id, bind);
			}
		}
		for (const { nodeName, values } of delta.parameterApplies) {
			const existing = pendingParameterApplies.get(nodeName);
			pendingParameterApplies.set(nodeName, { ...values, ...existing });
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
		for (const { nodeName, values } of delta.parameterApplies) {
			if (!updatedNodeNames.has(nodeName)) continue;
			const docNode = documentStore.getNodeByName(nodeName);
			if (!docNode) continue;
			const base = baseline.get(nodeName);
			// The same-field rule holds per key: keep the locally edited keys,
			// mirror the rest.
			const mirrorValues = Object.fromEntries(
				Object.entries(values).filter(([key]) =>
					isEqual(docNode.parameters?.[key], base?.parameters?.[key]),
				),
			);
			if (Object.keys(mirrorValues).length === 0) continue;
			documentStore.updateNodeProperties(
				{
					name: nodeName,
					properties: { parameters: { ...docNode.parameters, ...mirrorValues } },
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
			// applyDeltaToNodes mutates these nodes — snapshot the pre-PATCH
			// values first so the mirror can spot newer local edits.
			const baseline: NodesBaseline = new Map(
				nodes.map((node) => [
					node.name,
					{ credentials: { ...node.credentials }, parameters: { ...node.parameters } },
				]),
			);
			const outcome = applyDeltaToNodes(nodes, delta);
			if (outcome !== 'changed') return outcome;

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

			try {
				const updated = await workflowsStore.updateWorkflow(workflowId, {
					nodes,
					versionId: fresh.versionId,
					expectedChecksum: fresh.checksum,
				});
				syncHydratedDocument(workflowId, delta, baseline, updated);
				return 'applied';
			} catch (error) {
				const isConflict = error instanceof ResponseError && error.httpStatusCode === 409;
				if (!isConflict) return 'error';
			}
		}
		return 'conflict';
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
		if (toValue(options.isAgentBuilding)) {
			queuedWorkflowId = toValue(options.workflowId);
			pendingCredentialBinds.set(item.id, { item, credential });
			return 'queued';
		}
		const workflowId = toValue(options.workflowId);
		if (!workflowId) return 'error';
		return await patchWorkflowNodes(workflowId, {
			credentialBinds: [{ item, credential }],
			parameterApplies: [],
		});
	}

	/** Submits parameter values for a node (top-level keys merge over the saved ones). */
	async function applyParameterValues(
		nodeName: string,
		values: INodeParameters,
	): Promise<SetupPanelApplyResult> {
		if (toValue(options.isAgentBuilding)) {
			queuedWorkflowId = toValue(options.workflowId);
			const existing = pendingParameterApplies.get(nodeName);
			pendingParameterApplies.set(nodeName, { ...existing, ...values });
			return 'queued';
		}
		const workflowId = toValue(options.workflowId);
		if (!workflowId) return 'error';
		return await patchWorkflowNodes(workflowId, {
			credentialBinds: [],
			parameterApplies: [{ nodeName, values }],
		});
	}

	/**
	 * Lands every queued write in one guarded PATCH. One attempt — leftovers
	 * drop. Returns the apply outcome, or undefined when there was nothing to
	 * flush or the lock is still held.
	 */
	async function flushPendingApplies(): Promise<SetupPanelApplyResult | undefined> {
		// The lock rule holds for manual flushes too — the queue stays intact.
		if (toValue(options.isAgentBuilding)) return undefined;
		if (pendingApplyCount.value === 0) return undefined;
		const workflowId = toValue(options.workflowId);
		// Queued writes belong to the workflow they were captured for; if the
		// panel re-anchored since (even in this same flush), drop them.
		if (!workflowId || workflowId !== queuedWorkflowId) {
			pendingCredentialBinds.clear();
			pendingParameterApplies.clear();
			return 'dropped';
		}
		const delta: NodesDelta = {
			credentialBinds: [...pendingCredentialBinds.values()],
			parameterApplies: [...pendingParameterApplies.entries()].map(([nodeName, values]) => ({
				nodeName,
				values,
			})),
		};
		pendingCredentialBinds.clear();
		pendingParameterApplies.clear();
		return await patchWorkflowNodes(workflowId, delta);
	}

	watch(
		() => toValue(options.isAgentBuilding),
		(building, wasBuilding) => {
			if (wasBuilding && !building) {
				void flushPendingApplies().then((result) => {
					if (result) options.onFlushResult?.(result);
				});
			}
		},
	);

	// Queued writes are workflow-scoped (item ids embed the workflow id) — a
	// panel re-anchoring to another artifact must not flush them there.
	watch(
		() => toValue(options.workflowId),
		() => {
			pendingCredentialBinds.clear();
			pendingParameterApplies.clear();
		},
	);

	/**
	 * Sends the synthesized Execute message through the normal send endpoint.
	 * The handoff context routes it to the agent's test execution once the
	 * agent lane consumes it; until then the message text alone instructs the
	 * agent.
	 */
	async function executeWorkflow(): Promise<boolean> {
		const workflowId = toValue(options.workflowId);
		if (!workflowId) return false;
		return await options.thread.sendMessage(
			i18n.baseText('instanceAi.setupPanel.executeMessage'),
			undefined,
			rootStore.pushRef,
			{ source: 'setup-panel-execute', workflowId },
		);
	}

	return {
		bindCredential,
		applyParameterValues,
		executeWorkflow,
		flushPendingApplies,
		pendingApplyCount,
	};
}
