import { INodeUi, XYPosition } from '@/Interface';

import mixins from 'vue-typed-mixins';

import { deviceSupportHelpers } from '@/components/mixins/deviceSupportHelpers';
import { getMousePosition, getRelativePosition, HEADER_HEIGHT, SIDEBAR_WIDTH, SIDEBAR_WIDTH_EXPANDED } from '@/views/canvasHelpers';
import { VIEWS } from '@/constants';

export const mouseSelect = mixins(
	deviceSupportHelpers,
).extend({
	data () {
		return {
			selectActive: false,
			selectBox: document.createElement('span'),
		};
	},
	mounted () {
		this.createSelectBox();
	},
	computed: {
		isDemo (): boolean {
			return this.$route.name === VIEWS.DEMO;
		},
	},
	methods: {
		createSelectBox () {
			this.selectBox.id = 'select-box';
			this.selectBox.style.margin = '0px auto';
			this.selectBox.style.border = '2px dotted #FF0000';
			// Positioned absolutely within #node-view. This is consistent with how nodes are positioned.
			this.selectBox.style.position = 'absolute';
			this.selectBox.style.zIndex = '100';
			this.selectBox.style.visibility = 'hidden';

			this.selectBox.addEventListener('mouseup', this.mouseUpMouseSelect);

			const nodeViewEl = this.$el.querySelector('#node-view') as HTMLDivElement;
			nodeViewEl.appendChild(this.selectBox);
		},
		isCtrlKeyPressed (e: MouseEvent | KeyboardEvent): boolean {
			if (this.isTouchDevice === true) {
				return true;
			}
			if (this.isMacOs) {
				return e.metaKey;
			}
			return e.ctrlKey;
		},
		getMousePositionWithinNodeView (event: MouseEvent | TouchEvent): XYPosition {
			const [x, y] = getMousePosition(event);
			const sidebarOffset = this.isDemo ? 0 : this.$store.getters['ui/sidebarMenuCollapsed'] ? SIDEBAR_WIDTH : SIDEBAR_WIDTH_EXPANDED;
			const headerOffset = this.isDemo ? 0 : HEADER_HEIGHT;
			// @ts-ignore
			return getRelativePosition(x - sidebarOffset, y - headerOffset, this.nodeViewScale, this.$store.getters.getNodeViewOffsetPosition);
		},
		showSelectBox (event: MouseEvent) {
			const [x, y] = this.getMousePositionWithinNodeView(event);
			this.selectBox = Object.assign(this.selectBox, {x, y});

			// @ts-ignore
			this.selectBox.style.left = this.selectBox.x + 'px';
			// @ts-ignore
			this.selectBox.style.top = this.selectBox.y + 'px';
			this.selectBox.style.visibility = 'visible';

			this.selectActive = true;
		},
		updateSelectBox (event: MouseEvent) {
			const selectionBox = this.getSelectionBox(event);
			this.selectBox.style.left = selectionBox.x + 'px';
			this.selectBox.style.top = selectionBox.y + 'px';

			this.selectBox.style.width = selectionBox.width + 'px';
			this.selectBox.style.height = selectionBox.height + 'px';
		},
		hideSelectBox () {
			this.selectBox.style.visibility = 'hidden';
			// @ts-ignore
			this.selectBox.x = 0;
			// @ts-ignore
			this.selectBox.y = 0;
			this.selectBox.style.left = '0px';
			this.selectBox.style.top = '0px';
			this.selectBox.style.width = '0px';
			this.selectBox.style.height = '0px';

			this.selectActive = false;
		},
		getSelectionBox (event: MouseEvent) {
			const [x, y] = this.getMousePositionWithinNodeView(event);
			return {
				// @ts-ignore
				x: Math.min(x, this.selectBox.x),
				// @ts-ignore
				y: Math.min(y, this.selectBox.y),
				// @ts-ignore
				width: Math.abs(x - this.selectBox.x),
				// @ts-ignore
				height: Math.abs(y - this.selectBox.y),
			};
		},
		getNodesInSelection (event: MouseEvent): INodeUi[] {
			const returnNodes: INodeUi[] = [];
			const selectionBox = this.getSelectionBox(event);

			// Go through all nodes and check if they are selected
			this.$store.getters.allNodes.forEach((node: INodeUi) => {
				// TODO: Currently always uses the top left corner for checking. Should probably use the center instead
				if (node.position[0] < selectionBox.x || node.position[0] > (selectionBox.x + selectionBox.width)) {
					return;
				}
				if (node.position[1] < selectionBox.y || node.position[1] > (selectionBox.y + selectionBox.height)) {
					return;
				}
				returnNodes.push(node);
			});

			return returnNodes;
		},
		mouseDownMouseSelect (e: MouseEvent) {
			if (this.isCtrlKeyPressed(e) === true) {
				// We only care about it when the ctrl key is not pressed at the same time.
				// So we exit when it is pressed.
				return;
			}

			if (this.$store.getters.isActionActive('dragActive')) {
				// If a node does currently get dragged we do not activate the selection
				return;
			}
			this.showSelectBox(e);

			// @ts-ignore // Leave like this. Do not add a anonymous function because then remove would not work anymore
			this.$el.addEventListener('mousemove', this.mouseMoveSelect);
		},
		mouseUpMouseSelect (e: MouseEvent) {
			if (this.selectActive === false) {
				if (this.isTouchDevice === true) {
					// @ts-ignore
					if (e.target && e.target.id.includes('node-view')) {
						// Deselect all nodes
						this.deselectAllNodes();
					}
				}
				// If it is not active return directly.
				// Else normal node dragging will not work.
				return;
			}

			// @ts-ignore
			this.$el.removeEventListener('mousemove', this.mouseMoveSelect);

			// Deselect all nodes
			this.deselectAllNodes();

			// Select the nodes which are in the selection box
			const selectedNodes = this.getNodesInSelection(e);
			selectedNodes.forEach((node) => {
				this.nodeSelected(node);
			});

			if (selectedNodes.length === 1) {
				this.$store.commit('setLastSelectedNode', selectedNodes[0].name);
			}

			this.hideSelectBox();
		},
		mouseMoveSelect (e: MouseEvent) {
			if (e.buttons === 0) {
				// Mouse button is not pressed anymore so stop selection mode
				// Happens normally when mouse leave the view pressed and then
				// comes back unpressed.
				this.mouseUpMouseSelect(e);
				return;
			}

			this.updateSelectBox(e);
		},
		nodeDeselected (node: INodeUi) {
			this.$store.commit('removeNodeFromSelection', node);
			// @ts-ignore
			this.instance.removeFromDragSelection(node.id);
		},
		nodeSelected (node: INodeUi) {
			this.$store.commit('addSelectedNode', node);
			// @ts-ignore
			this.instance.addToDragSelection(node.id);
		},
		deselectAllNodes () {
			// @ts-ignore
			this.instance.clearDragSelection();
			this.$store.commit('resetSelectedNodes');
			this.$store.commit('setLastSelectedNode', null);
			this.$store.commit('setLastSelectedNodeOutputIndex', null);
			// @ts-ignore
			this.lastSelectedConnection = null;
			// @ts-ignore
			this.newNodeInsertPosition = null;
		},
	},
});
