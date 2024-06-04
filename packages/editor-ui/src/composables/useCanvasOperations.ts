import type { CanvasElement } from '@/types';
import type { INodeUi, XYPosition } from '@/Interface';
import { QUICKSTART_NOTE_NAME, STICKY_NODE_TYPE } from '@/constants';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useHistoryStore } from '@/stores/history.store';
import { useUIStore } from '@/stores/ui.store';
import { useTelemetry } from '@/composables/useTelemetry';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { MoveNodeCommand, RemoveConnectionCommand, RemoveNodeCommand } from '@/models/history';
import type { Connection } from '@vue-flow/core';
import { mapCanvasConnectionToLegacyConnection } from '@/utils/canvasUtilsV2';
import type { IConnection } from 'n8n-workflow';

export function useCanvasOperations() {
	const workflowsStore = useWorkflowsStore();
	const historyStore = useHistoryStore();
	const uiStore = useUIStore();

	const telemetry = useTelemetry();
	const externalHooks = useExternalHooks();

	/**
	 * Node operations
	 */

	function updateNodePosition(
		id: string,
		position: CanvasElement['position'],
		{ trackHistory = false, trackBulk = true } = {},
	) {
		const node = workflowsStore.getNodeById(id);
		if (!node) {
			return;
		}

		if (trackHistory && trackBulk) {
			historyStore.startRecordingUndo();
		}

		const oldPosition: XYPosition = [...node.position];
		const newPosition: XYPosition = [position.x, position.y];

		workflowsStore.setNodePositionById(id, newPosition);

		if (trackHistory) {
			historyStore.pushCommandToUndo(new MoveNodeCommand(node.name, oldPosition, newPosition));

			if (trackBulk) {
				historyStore.stopRecordingUndo();
			}
		}
	}

	function deleteNode(id: string, { trackHistory = false, trackBulk = true } = {}) {
		const node = workflowsStore.getNodeById(id);
		if (!node) {
			return;
		}

		if (trackHistory && trackBulk) {
			historyStore.startRecordingUndo();
		}

		workflowsStore.removeNodeById(id);
		workflowsStore.removeNodeConnectionsById(id);
		workflowsStore.removeNodeExecutionDataById(id);

		if (trackHistory) {
			historyStore.pushCommandToUndo(new RemoveNodeCommand(node));

			if (trackBulk) {
				historyStore.stopRecordingUndo();
			}
		}

		trackDeleteNode(id);
	}

	function revertDeleteNode(node: INodeUi) {
		workflowsStore.addNode(node);
	}

	function trackDeleteNode(id: string) {
		const node = workflowsStore.getNodeById(id);
		if (!node) {
			return;
		}

		if (node.type === STICKY_NODE_TYPE) {
			telemetry.track('User deleted workflow note', {
				workflow_id: workflowsStore.workflowId,
				is_welcome_note: node.name === QUICKSTART_NOTE_NAME,
			});
		} else {
			void externalHooks.run('node.deleteNode', { node });
			telemetry.track('User deleted node', {
				node_type: node.type,
				workflow_id: workflowsStore.workflowId,
			});
		}
	}

	/**
	 * Connection operations
	 */

	function createConnection(connection: Connection) {
		const sourceNode = workflowsStore.getNodeById(connection.source);
		const targetNode = workflowsStore.getNodeById(connection.target);
		if (!sourceNode || !targetNode || !isConnectionAllowed(sourceNode, targetNode)) {
			return;
		}

		const mappedConnection = mapCanvasConnectionToLegacyConnection(
			sourceNode,
			targetNode,
			connection,
		);
		workflowsStore.addConnection({
			connection: mappedConnection,
		});

		uiStore.stateIsDirty = true;
	}

	function deleteConnection(
		connection: Connection,
		{ trackHistory = false, trackBulk = true } = {},
	) {
		const sourceNode = workflowsStore.getNodeById(connection.source);
		const targetNode = workflowsStore.getNodeById(connection.target);
		if (!sourceNode || !targetNode) {
			return;
		}

		const mappedConnection = mapCanvasConnectionToLegacyConnection(
			sourceNode,
			targetNode,
			connection,
		);

		if (trackHistory && trackBulk) {
			historyStore.startRecordingUndo();
		}

		workflowsStore.removeConnection({
			connection: mappedConnection,
		});

		if (trackHistory) {
			historyStore.pushCommandToUndo(new RemoveConnectionCommand(mappedConnection));

			if (trackBulk) {
				historyStore.stopRecordingUndo();
			}
		}
	}

	function revertDeleteConnection(connection: [IConnection, IConnection]) {
		workflowsStore.addConnection({
			connection,
		});
	}

	// @TODO Figure out a way to improve this
	function isConnectionAllowed(sourceNode: INodeUi, targetNode: INodeUi): boolean {
		// const targetNodeType = nodeTypesStore.getNodeType(
		// 	targetNode.type,
		// 	targetNode.typeVersion,
		// );
		//
		// if (targetNodeType?.inputs?.length) {
		// 	const workflow = this.workflowHelpers.getCurrentWorkflow();
		// 	const workflowNode = workflow.getNode(targetNode.name);
		// 	let inputs: Array<ConnectionTypes | INodeInputConfiguration> = [];
		// 	if (targetNodeType) {
		// 		inputs = NodeHelpers.getNodeInputs(workflow, workflowNode, targetNodeType);
		// 	}
		//
		// 	for (const input of inputs || []) {
		// 		if (typeof input === 'string' || input.type !== targetInfoType || !input.filter) {
		// 			// No filters defined or wrong connection type
		// 			continue;
		// 		}
		//
		// 		if (input.filter.nodes.length) {
		// 			if (!input.filter.nodes.includes(sourceNode.type)) {
		// 				this.dropPrevented = true;
		// 				this.showToast({
		// 					title: this.$locale.baseText('nodeView.showError.nodeNodeCompatible.title'),
		// 					message: this.$locale.baseText('nodeView.showError.nodeNodeCompatible.message', {
		// 						interpolate: { sourceNodeName: sourceNode.name, targetNodeName: targetNode.name },
		// 					}),
		// 					type: 'error',
		// 					duration: 5000,
		// 				});
		// 				return false;
		// 			}
		// 		}
		// 	}
		// }
		return sourceNode.id !== targetNode.id;
	}

	return {
		updateNodePosition,
		deleteNode,
		revertDeleteNode,
		trackDeleteNode,
		createConnection,
		deleteConnection,
		revertDeleteConnection,
		isConnectionAllowed,
	};
}
