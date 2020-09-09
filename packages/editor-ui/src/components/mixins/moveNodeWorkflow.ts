import mixins from 'vue-typed-mixins';

import { nodeIndex } from '@/components/mixins/nodeIndex';

export const moveNodeWorkflow = mixins(nodeIndex).extend({
	data () {
		return {
			moveLastPosition: [0, 0],
		};
	},
	computed: {
		controlKeyCode (): string {
			if (this.isMacOs) {
				return 'Meta';
			}
			return 'Control';
		},
		isMacOs (): boolean {
			return /(ipad|iphone|ipod|mac)/i.test(navigator.platform);
		},
	},
	methods: {
		isCtrlKeyPressed (e: MouseEvent | KeyboardEvent): boolean {
			if (this.isMacOs) {
				return e.metaKey;
			}
			return e.ctrlKey;
		},
		moveWorkflow (e: MouseEvent) {
			const offsetPosition = this.$store.getters.getNodeViewOffsetPosition;

			const nodeViewOffsetPositionX = offsetPosition[0] + (e.pageX - this.moveLastPosition[0]);
			const nodeViewOffsetPositionY = offsetPosition[1] + (e.pageY - this.moveLastPosition[1]);
			this.$store.commit('setNodeViewOffsetPosition', {offset: [nodeViewOffsetPositionX, nodeViewOffsetPositionY], setStateDirty: true});

			// Update the last position
			this.moveLastPosition[0] = e.pageX;
			this.moveLastPosition[1] = e.pageY;
		},
		mouseDownMoveWorkflow (e: MouseEvent) {
			if (this.isCtrlKeyPressed(e) === false) {
				// We only care about it when the ctrl key is pressed at the same time.
				// So we exit when it is not pressed.
				return;
			}

			if (this.$store.getters.isActionActive('dragActive')) {
				// If a node does currently get dragged we do not activate the selection
				return;
			}

			this.$store.commit('setNodeViewMoveInProgress', true);

			this.moveLastPosition[0] = e.pageX;
			this.moveLastPosition[1] = e.pageY;

			// @ts-ignore
			this.$el.addEventListener('mousemove', this.mouseMoveNodeWorkflow);
		},
		mouseUpMoveWorkflow (e: MouseEvent) {
			if (this.$store.getters.isNodeViewMoveInProgress === false) {
				// If it is not active return direcly.
				// Else normal node dragging will not work.
				return;
			}

			// @ts-ignore
			this.$el.removeEventListener('mousemove', this.mouseMoveNodeWorkflow);

			this.$store.commit('setNodeViewMoveInProgress', false);

			// Nothing else to do. Simply leave the node view at the current offset
		},
		mouseMoveNodeWorkflow (e: MouseEvent) {
			if (e.buttons === 0) {
				// Mouse button is not pressed anymore so stop selection mode
				// Happens normally when mouse leave the view pressed and then
				// comes back unpressed.
				// @ts-ignore
				this.mouseUp(e);
				return;
			}

			this.moveWorkflow(e);
		},
		wheelMoveWorkflow (e: WheelEvent) {
			const offsetPosition = this.$store.getters.getNodeViewOffsetPosition;
			const nodeViewOffsetPositionX = offsetPosition[0] - e.deltaX;
			const nodeViewOffsetPositionY = offsetPosition[1] - e.deltaY;
			this.$store.commit('setNodeViewOffsetPosition', {offset: [nodeViewOffsetPositionX, nodeViewOffsetPositionY], setStateDirty: true});
		},
	},
});
