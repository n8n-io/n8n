import { defineStore } from 'pinia';
import { shallowReactive } from 'vue';

export type AgentNodeMeasurement = {
	height: number;
	// What the card showed when it was measured (see setNodeContentKey).
	contentKey: string;
};

export const useAgentNodeCanvasGeometryStore = defineStore('agentNodeCanvasGeometry', () => {
	const measurementsByCanvas = shallowReactive(
		new Map<string, Map<string, AgentNodeMeasurement>>(),
	);
	const contentKeysByCanvas = new Map<string, Map<string, string | undefined>>();
	const pendingCenterYByCanvas = new Map<string, Map<string, number>>();

	function setNodeMeasurement(canvasId: string, nodeId: string, measurement: AgentNodeMeasurement) {
		let measurementsByNode = measurementsByCanvas.get(canvasId);
		if (!measurementsByNode) {
			measurementsByNode = shallowReactive(new Map<string, AgentNodeMeasurement>());
			measurementsByCanvas.set(canvasId, measurementsByNode);
		}
		measurementsByNode.set(nodeId, measurement);
	}

	function getNodeMeasurement(canvasId: string, nodeId: string) {
		return measurementsByCanvas.get(canvasId)?.get(nodeId);
	}

	function getNodeHeight(canvasId: string, nodeId: string) {
		return getNodeMeasurement(canvasId, nodeId)?.height;
	}

	/**
	 * The card reports the content it currently renders, by value. `undefined`
	 * means the content is still loading, so the card's size is not meaningful
	 * yet. A card measured under a different key than before has new content
	 * (agent picked or edited); the same key means only load-time rendering
	 * settled.
	 */
	function setNodeContentKey(canvasId: string, nodeId: string, contentKey: string | undefined) {
		let contentKeysByNode = contentKeysByCanvas.get(canvasId);
		if (!contentKeysByNode) {
			contentKeysByNode = new Map();
			contentKeysByCanvas.set(canvasId, contentKeysByNode);
		}
		contentKeysByNode.set(nodeId, contentKey);
	}

	function getNodeContentKey(canvasId: string, nodeId: string) {
		return contentKeysByCanvas.get(canvasId)?.get(nodeId);
	}

	function setPendingCenterY(canvasId: string, nodeId: string, centerY: number) {
		let centerYByNode = pendingCenterYByCanvas.get(canvasId);
		if (!centerYByNode) {
			centerYByNode = new Map();
			pendingCenterYByCanvas.set(canvasId, centerYByNode);
		}
		centerYByNode.set(nodeId, centerY);
	}

	function consumePendingCenterY(canvasId: string, nodeId: string) {
		const centerYByNode = pendingCenterYByCanvas.get(canvasId);
		const centerY = centerYByNode?.get(nodeId);
		centerYByNode?.delete(nodeId);
		if (centerYByNode?.size === 0) pendingCenterYByCanvas.delete(canvasId);
		return centerY;
	}

	function clearCanvas(canvasId: string) {
		measurementsByCanvas.delete(canvasId);
		contentKeysByCanvas.delete(canvasId);
		pendingCenterYByCanvas.delete(canvasId);
	}

	return {
		setNodeMeasurement,
		getNodeMeasurement,
		getNodeHeight,
		setNodeContentKey,
		getNodeContentKey,
		setPendingCenterY,
		consumePendingCenterY,
		clearCanvas,
	};
});
