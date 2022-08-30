<template>
	<component :is="tag"
		:class="{[$style.dragging]: isDragging }"
		@mousedown="onDragStart"
		ref="wrapper"
	>
		<slot :isDragging="isDragging"></slot>

		<Teleport to="body">
			<div
				ref="draggable"
				:class="$style.draggable"
				:style="draggableStyle"
				v-show="isDragging"
			>
				<slot name="preview" :canDrop="canDrop" :el="draggingEl"></slot>
			</div>
		</Teleport>
	</component>
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
		tag: {
			type: String,
			default: 'div',
		},
		targetDataKey: {
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
			draggingEl: null as null | HTMLElement,
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

			const target = e.target as HTMLElement;
			if (this.targetDataKey && target && target.dataset.target !== this.targetDataKey) {
				return;
			}

			this.draggingEl = target;

			e.preventDefault();
			e.stopPropagation();
			this.isDragging = true;

			const data = this.targetDataKey ? target.dataset.value : (this.data || '');
			this.$store.commit('ui/draggableStartDragging', {type: this.type, data });

			this.$emit('dragstart', this.draggingEl);
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
				this.$emit('dragend', this.draggingEl);
				this.isDragging = false;
				this.draggingEl = null;
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
