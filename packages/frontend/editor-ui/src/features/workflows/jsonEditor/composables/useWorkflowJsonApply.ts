import { nextTick } from 'vue';
import { deepCopy, type INodeExecutionData, type IWorkflowSettings } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { useCanvasOperations } from '@/app/composables/useCanvasOperations';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { useHistoryStore } from '@/app/stores/history.store';
import { useUIStore } from '@/app/stores/ui.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { mapLegacyConnectionsToCanvasConnections } from '@/features/workflows/canvas/canvas.utils';

import { CallbackCommand } from '../callbackCommand';
import type { WorkflowJson } from '../workflowJson.types';
import {
	pickNodeFields,
	planWorkflowJsonApply,
	type ConnectionChange,
	type WorkflowJsonApplyPlan,
} from '../workflowJsonChanges';
import { toWorkflowJson } from '../workflowJsonDocument';

/** Only what the apply changed, so undo does not revert later edits elsewhere */
type Snapshot = {
	/** Keyed by the node name at the time of the snapshot; undefined means not pinned */
	pinData: Map<string, INodeExecutionData[] | undefined>;
	settings?: IWorkflowSettings;
	name?: string;
};

export type ApplyResult = {
	/** Connections that the canvas refused, for example because the port does not exist */
	refusedConnections: ConnectionChange[];
	/** Nodes that ended up with another name than in the JSON */
	renamedOnApply: Array<{ expected: string; actual: string }>;
	changedNodeIds: string[];
};

const HISTORY = { trackHistory: true, trackBulk: false };

/**
 * Applies an edited workflow JSON through the canvas operations that paste and import use.
 * Everything lands in one undo step.
 */
export function useWorkflowJsonApply() {
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const historyStore = useHistoryStore();
	const uiStore = useUIStore();
	const canvasOperations = useCanvasOperations();
	const nodeHelpers = useNodeHelpers();

	function currentWorkflowJson(): WorkflowJson {
		return toWorkflowJson(workflowDocumentStore.value.serialize());
	}

	function plan(edited: WorkflowJson): WorkflowJsonApplyPlan {
		const doc = workflowDocumentStore.value;
		return planWorkflowJsonApply(currentWorkflowJson(), edited, {
			currentNodes: doc.allNodes,
			currentConnections: doc.connectionsBySourceNode,
			createWorkflowObject: (nodes, connections) =>
				doc.createWorkflowObject(nodes, connections, true),
			createId: uuid,
		});
	}

	function takeSnapshot(nodeNames: string[], applyPlan: WorkflowJsonApplyPlan): Snapshot {
		const doc = workflowDocumentStore.value;
		const pinned = doc.getPinDataSnapshot();
		return {
			pinData: new Map(
				nodeNames.map((name) => [name, pinned[name] ? deepCopy(pinned[name]) : undefined]),
			),
			settings: applyPlan.settings ? deepCopy(doc.getSettingsSnapshot()) : undefined,
			name: applyPlan.name ? doc.name : undefined,
		};
	}

	function refreshIssues() {
		nodeHelpers.updateNodesParameterIssues();
		nodeHelpers.updateNodesCredentialsIssues();
		nodeHelpers.updateNodesInputIssues();
	}

	function restore(snapshot: Snapshot) {
		const doc = workflowDocumentStore.value;
		snapshot.pinData.forEach((items, name) => {
			if (!doc.getNodeByName(name)) return;
			if (items) doc.pinNodeData(name, deepCopy(items));
			else doc.unpinNodeData(name);
		});
		if (snapshot.settings) doc.setSettings(deepCopy(snapshot.settings));
		if (snapshot.name !== undefined) doc.setName(snapshot.name);
		refreshIssues();
		uiStore.markStateDirty();
	}

	async function renameAll(renames: WorkflowJsonApplyPlan['renames']) {
		const doc = workflowDocumentStore.value;
		const takenByOthers = renames.some(({ id, to }) => {
			const holder = doc.getNodeByName(to);
			return !!holder && holder.id !== id;
		});
		// Swaps and chains (A→B, B→C) need a free name in between
		if (takenByOthers) {
			for (const [index, rename] of renames.entries()) {
				const node = doc.getNodeById(rename.id);
				if (!node) continue;
				await canvasOperations.renameNode(node.name, `${rename.from} (${index + 1}~)`, {
					...HISTORY,
					showErrorToast: false,
				});
			}
		}
		for (const rename of renames) {
			const node = doc.getNodeById(rename.id);
			if (!node) continue;
			await canvasOperations.renameNode(node.name, rename.to, {
				...HISTORY,
				showErrorToast: false,
			});
		}
	}

	async function apply(applyPlan: WorkflowJsonApplyPlan): Promise<ApplyResult> {
		const doc = () => workflowDocumentStore.value;
		const nameBefore = (id: string) => doc().getNodeById(id)?.name;
		const before = takeSnapshot(
			[
				...applyPlan.pinData.map((change) => nameBefore(change.id)),
				...applyPlan.removed.map((node) => node.name),
				...applyPlan.replaced.map(({ before: node }) => node.name),
			].filter((name) => name !== undefined),
			applyPlan,
		);

		historyStore.startRecordingUndo();
		try {
			// Pushed first so undo runs it last, after removed nodes are back
			historyStore.pushCommandToUndo(
				new CallbackCommand(
					'jsonEditorRestore',
					() => restore(before),
					() => {},
					Date.now(),
				),
			);
			uiStore.resetLastInteractedWith();

			// Connections go first, so deleting a node does not bridge its neighbours.
			// The JSON is the target state, so canvas group rules do not veto single steps.
			applyPlan.connectionsToRemove.forEach(({ connection }) =>
				canvasOperations.deleteConnection(connection, { ...HISTORY, validateNodeGroups: false }),
			);
			applyPlan.removed.forEach((node) => canvasOperations.deleteNode(node.id, HISTORY));

			// A replaced node is renamed before it is deleted, so the canvas rename rewrites references to it
			await renameAll(applyPlan.renames);
			applyPlan.replaced.forEach(({ before: node }) =>
				canvasOperations.deleteNode(node.id, HISTORY),
			);

			for (const update of applyPlan.updates) {
				const node = doc().getNodeById(update.id);
				if (!node) continue;
				// Fields first: a new typeVersion decides which parameters exist.
				// Their own undo step sits between the connection steps, because onError and
				// typeVersion decide which ports exist when connections are replayed.
				if (update.changedFieldKeys.length > 0) {
					const fieldsBefore = deepCopy(pickNodeFields(node, update.changedFieldKeys));
					const fieldsAfter = deepCopy(update.fields);
					doc().updateNodeById(update.id, deepCopy(fieldsAfter));
					historyStore.pushCommandToUndo(
						new CallbackCommand(
							'jsonEditorNodeFields',
							() => {
								doc().updateNodeById(update.id, deepCopy(fieldsBefore));
							},
							() => {
								doc().updateNodeById(update.id, deepCopy(fieldsAfter));
							},
							Date.now(),
						),
					);
				}
				if (update.parameters) {
					canvasOperations.replaceNodeParameters(
						update.id,
						deepCopy(node.parameters),
						deepCopy(update.parameters),
						HISTORY,
					);
				}
				if (update.position) {
					canvasOperations.updateNodePosition(
						update.id,
						{ x: update.position[0], y: update.position[1] },
						{ trackHistory: true },
					);
				}
				if (update.disabled !== undefined && (node.disabled === true) !== update.disabled) {
					nodeHelpers.disableNodes([node], HISTORY);
				}
			}

			const newNodes = [...applyPlan.added, ...applyPlan.replaced.map(({ after }) => after)];
			if (newNodes.length > 0) {
				await canvasOperations.addNodes(
					newNodes.map((node) => ({ ...deepCopy(node), isAutoAdd: true, openDetail: false })),
					{ ...HISTORY, keepPristine: true, telemetry: false },
				);
			}

			if (applyPlan.connectionsToAdd.length > 0) {
				await canvasOperations.addConnections(
					applyPlan.connectionsToAdd.map(({ connection }) => connection),
					{ ...HISTORY, keepPristine: true },
				);
			}

			applyPlan.pinData.forEach((change) => {
				if (change.data) doc().pinNodeData(change.name, deepCopy(change.data));
				else doc().unpinNodeData(change.name);
			});
			if (applyPlan.settings) doc().setSettings(deepCopy(applyPlan.settings.value));
			if (applyPlan.name) doc().setName(applyPlan.name.to);

			const after = takeSnapshot(
				[
					...applyPlan.pinData.map((change) => change.name),
					...applyPlan.replaced.map(({ after: node }) => node.name),
				],
				applyPlan,
			);
			// Pushed last so redo runs it last, after the nodes exist again
			historyStore.pushCommandToUndo(
				new CallbackCommand(
					'jsonEditorApply',
					() => {},
					() => restore(after),
					Date.now(),
				),
			);
		} finally {
			historyStore.stopRecordingUndo();
		}

		await nextTick();
		refreshIssues();
		uiStore.markStateDirty();
		return checkResult(applyPlan);
	}

	function checkResult(applyPlan: WorkflowJsonApplyPlan): ApplyResult {
		const doc = workflowDocumentStore.value;
		const present = new Set(
			mapLegacyConnectionsToCanvasConnections(doc.connectionsBySourceNode, doc.allNodes).map(
				(connection) => connection.id,
			),
		);
		const renamedOnApply = applyPlan.edited.nodes
			.map((node) => ({ expected: node.name, actual: doc.getNodeById(node.id)?.name }))
			.filter(
				(entry): entry is { expected: string; actual: string } =>
					entry.actual !== undefined && entry.actual !== entry.expected,
			);
		return {
			refusedConnections: applyPlan.connectionsToAdd.filter(
				({ connection }) => !present.has(connection.id),
			),
			renamedOnApply,
			changedNodeIds: [
				...applyPlan.added.map((node) => node.id),
				...applyPlan.replaced.map(({ after }) => after.id),
				...applyPlan.renames.map((rename) => rename.id),
				...applyPlan.updates.map((update) => update.id),
			],
		};
	}

	return { currentWorkflowJson, plan, apply };
}
