import type { INodeUi, XYPosition } from '@/Interface';

import useDeviceSupport from './useDeviceSupport';
import { useUIStore } from '@/stores/ui';
import { useWorkflowsStore } from '@/stores/workflows';
import {
	getMousePosition,
	getRelativePosition,
	HEADER_HEIGHT,
	SIDEBAR_WIDTH,
	SIDEBAR_WIDTH_EXPANDED,
} from '@/utils/nodeViewUtils';
import { ref, watchEffect, onMounted, computed, onUnmounted } from 'vue';
import { useCanvasStore } from '@/stores/canvas';

interface ExtendedHTMLSpanElement extends HTMLSpanElement {
	x: number;
	y: number;
}

export default function useCanvasMouseSelect() {
	const selectActive = ref(false);
	const selectBox = ref(document.createElement('span') as ExtendedHTMLSpanElement);

	const { isTouchDevice, isCtrlKeyPressed } = useDeviceSupport();
	const uiStore = useUIStore();
	const canvasStore = useCanvasStore();
	const workflowsStore = useWorkflowsStore();

	function _setSelectBoxStyle(styles: Record<string, string>) {
		Object.assign(selectBox.value.style, styles);
	}

	function _showSelectBox(event: MouseEvent) {
		const [x, y] = getMousePositionWithinNodeView(event);
		selectBox.value = Object.assign(selectBox.value, { x, y });

		_setSelectBoxStyle({
			left: selectBox.value.x + 'px',
			top: selectBox.value.y + 'px',
			visibility: 'visible',
		});
		selectActive.value = true;
	}

	function _updateSelectBox(event: MouseEvent) {
		const selectionBox = _getSelectionBox(event);

		_setSelectBoxStyle({
			left: selectionBox.x + 'px',
			top: selectionBox.y + 'px',
			width: selectionBox.width + 'px',
			height: selectionBox.height + 'px',
		});
	}

	function _hideSelectBox() {
		selectBox.value.x = 0;
		selectBox.value.y = 0;

		_setSelectBoxStyle({
			visibility: 'hidden',
			left: '0px',
			top: '0px',
			width: '0px',
			height: '0px',
		});
		selectActive.value = false;
	}

	function _getSelectionBox(event: MouseEvent) {
		const [x, y] = getMousePositionWithinNodeView(event);
		return {
			x: Math.min(x, selectBox.value.x),
			y: Math.min(y, selectBox.value.y),
			width: Math.abs(x - selectBox.value.x),
			height: Math.abs(y - selectBox.value.y),
		};
	}

	function _getNodesInSelection(event: MouseEvent): INodeUi[] {
		const returnNodes: INodeUi[] = [];
		const selectionBox = _getSelectionBox(event);

		// Go through all nodes and check if they are selected
		workflowsStore.allNodes.forEach((node: INodeUi) => {
			// TODO: Currently always uses the top left corner for checking. Should probably use the center instead
			if (
				node.position[0] < selectionBox.x ||
				node.position[0] > selectionBox.x + selectionBox.width
			) {
				return;
			}
			if (
				node.position[1] < selectionBox.y ||
				node.position[1] > selectionBox.y + selectionBox.height
			) {
				return;
			}
			returnNodes.push(node);
		});

		return returnNodes;
	}

	function _createSelectBox() {
		selectBox.value.id = 'select-box';
		_setSelectBoxStyle({
			margin: '0px auto',
			border: '2px dotted #FF0000',
			// Positioned absolutely within #node-view. This is consistent with how nodes are positioned.
			position: 'absolute',
			zIndex: '100',
			visibility: 'hidden',
		});

		selectBox.value.addEventListener('mouseup', mouseUpMouseSelect);

		const nodeViewEl = document.querySelector('#node-view') as HTMLDivElement;
		nodeViewEl.appendChild(selectBox.value);
	}

	function _mouseMoveSelect(e: MouseEvent) {
		if (e.buttons === 0) {
			// Mouse button is not pressed anymore so stop selection mode
			// Happens normally when mouse leave the view pressed and then
			// comes back unpressed.
			mouseUpMouseSelect(e);
			return;
		}

		_updateSelectBox(e);
	}

	function mouseUpMouseSelect(e: MouseEvent) {
		if (selectActive.value === false) {
			if (isTouchDevice === true && e.target instanceof HTMLElement) {
				if (e.target && e.target.id.includes('node-view')) {
					// Deselect all nodes
					deselectAllNodes();
				}
			}
			// If it is not active return directly.
			// Else normal node dragging will not work.
			return;
		}
		document.removeEventListener('mousemove', _mouseMoveSelect);

		// Deselect all nodes
		deselectAllNodes();

		// Select the nodes which are in the selection box
		const selectedNodes = _getNodesInSelection(e);
		selectedNodes.forEach((node) => {
			nodeSelected(node);
		});

		if (selectedNodes.length === 1) {
			uiStore.lastSelectedNode = selectedNodes[0].name;
		}

		_hideSelectBox();
	}
	function mouseDownMouseSelect(e: MouseEvent, moveButtonPressed: boolean) {
		if (isCtrlKeyPressed(e) === true || moveButtonPressed) {
			// We only care about it when the ctrl key is not pressed at the same time.
			// So we exit when it is pressed.
			return;
		}

		if (uiStore.isActionActive('dragActive')) {
			// If a node does currently get dragged we do not activate the selection
			return;
		}
		_showSelectBox(e);

		// Leave like this.
		// Do not add an anonymous function because then remove would not work anymore
		document.addEventListener('mousemove', _mouseMoveSelect);
	}

	function getMousePositionWithinNodeView(event: MouseEvent | TouchEvent): XYPosition {
		const [mouseX, mouseY] = getMousePosition(event);

		const sidebarWidth = canvasStore.isDemo
			? 0
			: uiStore.sidebarMenuCollapsed
			? SIDEBAR_WIDTH
			: SIDEBAR_WIDTH_EXPANDED;
		const headerHeight = canvasStore.isDemo ? 0 : HEADER_HEIGHT;

		const relativeX = mouseX - sidebarWidth;
		const relativeY = mouseY - headerHeight;
		const nodeViewScale = canvasStore.nodeViewScale;
		const nodeViewOffsetPosition = uiStore.nodeViewOffsetPosition;

		return getRelativePosition(relativeX, relativeY, nodeViewScale, nodeViewOffsetPosition);
	}

	function nodeDeselected(node: INodeUi) {
		uiStore.removeNodeFromSelection(node);
		instance.value.removeFromDragSelection(instance.value.getManagedElement(node?.id));
	}

	function nodeSelected(node: INodeUi) {
		uiStore.addSelectedNode(node);
		instance.value.addToDragSelection(instance.value.getManagedElement(node?.id));
	}

	function deselectAllNodes() {
		instance.value.clearDragSelection();
		uiStore.resetSelectedNodes();
		uiStore.lastSelectedNode = null;
		uiStore.lastSelectedNodeOutputIndex = null;

		canvasStore.lastSelectedConnection = null;
		canvasStore.newNodeInsertPosition = null;
	}

	const instance = computed(() => canvasStore.jsPlumbInstance);

	onMounted(() => {
		_createSelectBox();
	});

	return {
		getMousePositionWithinNodeView,
		mouseUpMouseSelect,
		mouseDownMouseSelect,
		nodeDeselected,
		nodeSelected,
		deselectAllNodes,
	};
}
