<template>
	<div
		:class="{[$style.dragging]: isDragging }"
		@mousedown="onDragStart"
	>
		<slot :isDragging="isDragging"></slot>

		<Teleport to="body">
			<div
				ref="draggable"
				:class="$style.draggable"
				:style="draggableStyle"
				v-show="isDragging"
			>
				<slot name="preview" :canDrop="canDrop"></slot>
			</div>
		</Teleport>
	</div>
</template>

<script lang="ts">
import { XYPosition } from '@/Interface';
import Vue from 'vue';

// @ts-ignore
import Teleport from 'vue2-teleport';

export default Vue.extend({
	components: {
		Teleport,
	},
	props: {
		disabled: {
			type: Boolean,
		},
		type: {
			type: String,
		},
		data: {
			type: String,
		},
	},
	data() {
		return {
			isDragging: false,
			draggablePosition: {
				x: -100,
				y: -100,
			},
		};
	},
	computed: {
		draggableStyle(): { top: string; left: string; } {
			return {
				top: `${this.draggablePosition.y}px`,
				left: `${this.draggablePosition.x}px`,
			};
		},
		canDrop(): boolean {
			return this.$store.getters['ui/canDraggableDrop'];
		},
		stickyPosition(): XYPosition | null {
			return this.$store.getters['ui/draggableStickyPos'];
		},
	},
	methods: {
		onDragStart(e: DragEvent) {
			if (this.disabled) {
				return;
			}

			e.preventDefault();
			e.stopPropagation();
			this.isDragging = true;
			this.$store.commit('ui/draggableStartDragging', {type: this.type, data: this.data || ''});

			this.$emit('dragstart');
			document.body.style.cursor = 'grabbing';

			window.addEventListener('mousemove', this.onDrag);
			window.addEventListener('mouseup', this.onDragEnd);

			this.draggablePosition = { x: e.pageX, y: e.pageY };
		},
		onDrag(e: MouseEvent) {
			if (this.disabled) {
				return;
			}

			e.preventDefault();
			e.stopPropagation();

			if (this.canDrop && this.stickyPosition) {
				this.draggablePosition = { x: this.stickyPosition[0], y: this.stickyPosition[1]};
			}
			else {
				this.draggablePosition = { x: e.pageX, y: e.pageY };
			}

			this.$emit('drag', this.draggablePosition);
		},
		onDragEnd(e: MouseEvent) {
			if (this.disabled) {
				return;
			}

			e.preventDefault();
			e.stopPropagation();

			document.body.style.cursor = 'unset';
			window.removeEventListener('mousemove', this.onDrag);
			window.removeEventListener('mouseup', this.onDragEnd);

			setTimeout(() => {
				this.$emit('dragend');
				this.isDragging = false;
				this.$store.commit('ui/draggableStopDragging');
			}, 0);
		},
	},
});
</script>

<style lang="scss" module>
.dragging {
	visibility: visible;
	cursor: grabbing;
}

.draggable {
	position: fixed;
	z-index: 9999999;
}

.draggable-data-transfer {
	width: 0px;
	height: 0px;
}
</style>
