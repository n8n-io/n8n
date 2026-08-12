import { defineStore } from 'pinia';

export const useAgentNodeCanvasGeometryStore = defineStore('agentNodeCanvasGeometry', () => {
	const nodeHeightsByCanvas = new Map<string, Map<string, number>>();
	const pendingCenterYByCanvas = new Map<string, Map<string, number>>();

	function setNodeHeight(canvasId: string, nodeId: string, height: number) {
		let heightsByNode = nodeHeightsByCanvas.get(canvasId);
		if (!heightsByNode) {
			heightsByNode = new Map();
			nodeHeightsByCanvas.set(canvasId, heightsByNode);
		}
		heightsByNode.set(nodeId, height);
	}

	function getNodeHeight(canvasId: string, nodeId: string) {
		return nodeHeightsByCanvas.get(canvasId)?.get(nodeId);
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
		nodeHeightsByCanvas.delete(canvasId);
		pendingCenterYByCanvas.delete(canvasId);
	}

	return {
		setNodeHeight,
		getNodeHeight,
		setPendingCenterY,
		consumePendingCenterY,
		clearCanvas,
	};
});
