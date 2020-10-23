import mixins from 'vue-typed-mixins';
import normalizeWheel from 'normalize-wheel';

import { deviceSupportHelpers } from '@/components/mixins/deviceSupportHelpers';
import { nodeIndex } from '@/components/mixins/nodeIndex';

export const moveNodeWorkflow = mixins(
	deviceSupportHelpers,
	nodeIndex,
).extend({
	data () {
		return {
			moveLastPosition: [0, 0],
		};
	},

	methods: {
		getMousePosition(e: MouseEvent | TouchEvent) {
			// @ts-ignore
			const x = e.pageX !== undefined ? e.pageX : (e.touches && e.touches[0] && e.touches[0].pageX ? e.touches[0].pageX : 0);
			// @ts-ignore
			const y = e.pageY !== undefined ? e.pageY : (e.touches && e.touches[0] && e.touches[0].pageY ? e.touches[0].pageY : 0);

			return {
				x,
				y,
			};
		},
		moveWorkflow (e: MouseEvent) {
			const offsetPosition = this.$store.getters.getNodeViewOffsetPosition;

			const position = this.getMousePosition(e);

			const nodeViewOffsetPositionX = offsetPosition[0] + (position.x - this.moveLastPosition[0]);
			const nodeViewOffsetPositionY = offsetPosition[1] + (position.y - this.moveLastPosition[1]);
			this.$store.commit('setNodeViewOffsetPosition', [nodeViewOffsetPositionX, nodeViewOffsetPositionY]);

			// Update the last position
			this.moveLastPosition[0] = position.x;
			this.moveLastPosition[1] = position.y;
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

			const position = this.getMousePosition(e);

			this.moveLastPosition[0] = position.x;
			this.moveLastPosition[1] = position.y;

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
			// @ts-ignore
			if (e.target && !e.target.id.includes('node-view')) {
				return;
			}

			if (this.$store.getters.isActionActive('dragActive')) {
				return;
			}

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
			const normalized = normalizeWheel(e);
			const offsetPosition = this.$store.getters.getNodeViewOffsetPosition;
			const nodeViewOffsetPositionX = offsetPosition[0] - normalized.pixelX;
			const nodeViewOffsetPositionY = offsetPosition[1] - normalized.pixelY;
			this.$store.commit('setNodeViewOffsetPosition', [nodeViewOffsetPositionX, nodeViewOffsetPositionY]);
		},
	},
});
