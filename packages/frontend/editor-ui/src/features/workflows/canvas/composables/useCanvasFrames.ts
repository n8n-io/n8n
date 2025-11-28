import { computed, type Ref, type ComputedRef } from 'vue';
import type { IFrame } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import type { BoundingBox } from '../canvas.types';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { v4 as uuid } from 'uuid';

const NODE_SIZE = 100; // Default node size for bounds calculation
const FRAME_PADDING = 32; // Padding around nodes when creating frame

export interface UseCanvasFramesOptions {
	nodes: Ref<INodeUi[]> | ComputedRef<INodeUi[]>;
}

export function useCanvasFrames({ nodes }: UseCanvasFramesOptions) {
	const workflowsStore = useWorkflowsStore();

	const frames = computed(() => workflowsStore.frames);

	/**
	 * Check if a node is inside a frame's bounds
	 */
	function isNodeInsideFrame(node: INodeUi, frame: IFrame): boolean {
		const nodeCenterX = node.position[0] + NODE_SIZE / 2;
		const nodeCenterY = node.position[1] + NODE_SIZE / 2;

		return (
			nodeCenterX >= frame.position[0] &&
			nodeCenterX <= frame.position[0] + frame.width &&
			nodeCenterY >= frame.position[1] &&
			nodeCenterY <= frame.position[1] + frame.height
		);
	}

	/**
	 * Get all nodes inside a frame's bounds
	 */
	function getNodesInsideFrame(frame: IFrame): INodeUi[] {
		return nodes.value.filter((node) => isNodeInsideFrame(node, frame));
	}

	/**
	 * Get node IDs inside a frame's bounds
	 */
	function getNodeIdsInsideFrame(frame: IFrame): string[] {
		return getNodesInsideFrame(frame).map((node) => node.id);
	}

	/**
	 * Get the frame containing a node (if any)
	 */
	function getFrameContainingNode(nodeId: string): IFrame | undefined {
		const node = nodes.value.find((n) => n.id === nodeId);
		if (!node) return undefined;

		return frames.value.find((frame) => isNodeInsideFrame(node, frame));
	}

	/**
	 * Calculate bounding box for a set of nodes
	 */
	function calculateBoundsForNodes(nodeIds: string[]): BoundingBox | null {
		const selectedNodes = nodes.value.filter((n) => nodeIds.includes(n.id));
		if (selectedNodes.length === 0) return null;

		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;

		selectedNodes.forEach((node) => {
			const x = node.position[0];
			const y = node.position[1];
			const width = (node.parameters?.width as number) ?? NODE_SIZE;
			const height = (node.parameters?.height as number) ?? NODE_SIZE;

			minX = Math.min(minX, x);
			minY = Math.min(minY, y);
			maxX = Math.max(maxX, x + width);
			maxY = Math.max(maxY, y + height);
		});

		return {
			x: minX,
			y: minY,
			width: maxX - minX,
			height: maxY - minY,
		};
	}

	/**
	 * Create a frame around the specified nodes
	 * If no nodeIds provided, creates an empty frame at the given position
	 */
	function createFrame(options: {
		nodeIds?: string[];
		position?: [number, number];
		name?: string;
		color?: number;
	}): IFrame {
		const { nodeIds = [], position, name, color = 1 } = options;

		let framePosition: [number, number];
		let frameWidth: number;
		let frameHeight: number;

		if (nodeIds.length > 0) {
			// Calculate bounds from nodes
			const bounds = calculateBoundsForNodes(nodeIds);
			if (bounds) {
				framePosition = [bounds.x - FRAME_PADDING, bounds.y - FRAME_PADDING];
				frameWidth = bounds.width + FRAME_PADDING * 2;
				frameHeight = bounds.height + FRAME_PADDING * 2;
			} else {
				// Fallback if bounds calculation fails
				framePosition = position ?? [0, 0];
				frameWidth = 400;
				frameHeight = 300;
			}
		} else {
			// Create empty frame at position
			framePosition = position ?? [0, 0];
			frameWidth = 400;
			frameHeight = 300;
		}

		const frameCount = frames.value.length;
		const frame: IFrame = {
			id: uuid(),
			name: name ?? `Frame ${frameCount + 1}`,
			position: framePosition,
			width: frameWidth,
			height: frameHeight,
			color,
			label: name ?? `Frame ${frameCount + 1}`,
		};

		workflowsStore.addFrame(frame);
		return frame;
	}

	/**
	 * Update a frame's properties
	 */
	function updateFrame(frameId: string, updates: Partial<IFrame>): void {
		workflowsStore.updateFrame(frameId, updates);
	}

	/**
	 * Delete a frame (nodes inside are not affected)
	 */
	function deleteFrame(frameId: string): void {
		workflowsStore.removeFrame(frameId);
	}

	/**
	 * Move a frame and all nodes inside it
	 */
	function moveFrameWithContents(
		frameId: string,
		delta: { x: number; y: number },
		updateNodePosition: (nodeId: string, position: [number, number]) => void,
	): void {
		const frame = workflowsStore.getFrameById(frameId);
		if (!frame) return;

		// Get nodes inside the frame BEFORE moving it
		const containedNodes = getNodesInsideFrame(frame);

		// Update frame position
		const newPosition: [number, number] = [
			frame.position[0] + delta.x,
			frame.position[1] + delta.y,
		];
		updateFrame(frameId, { position: newPosition });

		// Update positions of all contained nodes
		containedNodes.forEach((node) => {
			const newNodePosition: [number, number] = [
				node.position[0] + delta.x,
				node.position[1] + delta.y,
			];
			updateNodePosition(node.id, newNodePosition);
		});
	}

	/**
	 * Get frame by ID
	 */
	function getFrameById(frameId: string): IFrame | undefined {
		return workflowsStore.getFrameById(frameId);
	}

	return {
		frames,
		isNodeInsideFrame,
		getNodesInsideFrame,
		getNodeIdsInsideFrame,
		getFrameContainingNode,
		calculateBoundsForNodes,
		createFrame,
		updateFrame,
		deleteFrame,
		moveFrameWithContents,
		getFrameById,
	};
}
