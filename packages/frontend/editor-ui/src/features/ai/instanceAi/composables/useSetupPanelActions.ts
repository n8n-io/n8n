import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';

import type {
	InstanceAiAttachment,
	InstanceAiHandoffContext,
	InstanceAiSetupItem,
} from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { INodeParameters } from 'n8n-workflow';

import type { INodeUi, IWorkflowDb } from '@/Interface';
import { getWorkflow } from '@/app/api/workflows';
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
	/** No target node exists in the saved workflow anymore — rows re-derive. */
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
}) {
	const i18n = useI18n();
	const rootStore = useRootStore();
	const workflowsStore = useWorkflowsStore();

	const pendingCredentialBinds = ref(new Map<string, CredentialBind>());
	const pendingParameterApplies = ref(new Map<string, INodeParameters>());

	/** Queued writes awaiting the agent lock release. */
	const pendingApplyCount = computed(
		() => pendingCredentialBinds.value.size + pendingParameterApplies.value.size,
	);

	/**
	 * Mirrors an applied delta into a live canvas document, if a host has one
	 * hydrated: the derivation reads the document's nodes while it exists, and
	 * the document's next save would otherwise clobber the bind (its nodes) or
	 * version-conflict (its stale versionId/checksum).
	 */
	function syncHydratedDocument(workflowId: string, delta: NodesDelta, updated: IWorkflowDb) {
		const documentStore = useExistingWorkflowDocumentStore(createWorkflowDocumentId(workflowId));
		if (!documentStore?.hydrated) return;

		const nodesByName = new Map(updated.nodes.map((node) => [node.name, node]));
		for (const { item } of delta.credentialBinds) {
			for (const binding of item.nodeBindings ?? []) {
				const node = nodesByName.get(binding.nodeName);
				if (!node) continue;
				documentStore.updateNodeProperties({
					name: binding.nodeName,
					properties: { credentials: node.credentials },
				});
			}
		}
		for (const { nodeName } of delta.parameterApplies) {
			const node = nodesByName.get(nodeName);
			if (!node) continue;
			documentStore.updateNodeProperties({
				name: nodeName,
				properties: { parameters: node.parameters },
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
	): Promise<Exclude<SetupPanelApplyResult, 'queued'>> {
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
			const outcome = applyDeltaToNodes(nodes, delta);
			if (outcome !== 'changed') return outcome;

			try {
				const updated = await workflowsStore.updateWorkflow(workflowId, {
					nodes,
					versionId: fresh.versionId,
					expectedChecksum: fresh.checksum,
				});
				syncHydratedDocument(workflowId, delta, updated);
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
			pendingCredentialBinds.value.set(item.id, { item, credential });
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
			const existing = pendingParameterApplies.value.get(nodeName);
			pendingParameterApplies.value.set(nodeName, { ...existing, ...values });
			return 'queued';
		}
		const workflowId = toValue(options.workflowId);
		if (!workflowId) return 'error';
		return await patchWorkflowNodes(workflowId, {
			credentialBinds: [],
			parameterApplies: [{ nodeName, values }],
		});
	}

	/** Lands every queued write in one guarded PATCH. One attempt — leftovers drop. */
	async function flushPendingApplies(): Promise<void> {
		// The lock rule holds for manual flushes too — the queue stays intact.
		if (toValue(options.isAgentBuilding)) return;
		const workflowId = toValue(options.workflowId);
		const delta: NodesDelta = {
			credentialBinds: [...pendingCredentialBinds.value.values()],
			parameterApplies: [...pendingParameterApplies.value.entries()].map(([nodeName, values]) => ({
				nodeName,
				values,
			})),
		};
		pendingCredentialBinds.value.clear();
		pendingParameterApplies.value.clear();
		if (!workflowId || (delta.credentialBinds.length === 0 && delta.parameterApplies.length === 0))
			return;
		await patchWorkflowNodes(workflowId, delta);
	}

	watch(
		() => toValue(options.isAgentBuilding),
		(building, wasBuilding) => {
			if (wasBuilding && !building) void flushPendingApplies();
		},
	);

	// Queued writes are workflow-scoped (item ids embed the workflow id) — a
	// panel re-anchoring to another artifact must not flush them there.
	watch(
		() => toValue(options.workflowId),
		() => {
			pendingCredentialBinds.value.clear();
			pendingParameterApplies.value.clear();
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
			undefined,
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
