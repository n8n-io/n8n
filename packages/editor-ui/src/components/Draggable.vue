<template>
	<div
		:class="{[$style.dragging]: isDragging }"
		@mousedown="onDragStart"
	>
		<slot :isDragging="isDragging"></slot>

		<div v-if="$slots.preview" :class="$style['draggable-data-transfer']" ref="draggableDataTransfer" />
		<Teleport to="body">
			<transition name="preview-transition">
				<div
					ref="draggable"
					:class="$style.draggable"
					:style="draggableStyle"
					v-show="isDragging"
				>
					<slot name="preview"></slot>
				</div>
			</transition>
		</Teleport>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';

import Teleport from 'vue2-teleport';

export default Vue.extend({
	components: {
		Teleport,
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
	},
	methods: {
		onDragStart(e: DragEvent) {
			e.preventDefault();
			e.stopPropagation();
			this.isDragging = true;

			this.$emit('dragstart');
			document.body.style.cursor = 'grabbing';

			window.addEventListener('mousemove', this.onDrag);
			window.addEventListener('mouseup', this.onDragEnd);

			if (e.dataTransfer) {
				e.dataTransfer.effectAllowed = "copy";
				e.dataTransfer.dropEffect = "copy";
				// e.dataTransfer.setData('nodeTypeName', this.nodeType.name);
				e.dataTransfer.setDragImage(this.$refs.draggableDataTransfer as Element, 0, 0);
			}

			this.draggablePosition = { x: e.pageX, y: e.pageY };
		},
		onDrag(e: MouseEvent) {
			e.preventDefault();
			e.stopPropagation();

			this.draggablePosition = { x: e.pageX, y: e.pageY };
			this.$emit('drag', {x: e.pageX, y: e.pageY});
		},
		onDragEnd(e: MouseEvent) {
			e.preventDefault();
			e.stopPropagation();

			document.body.style.cursor = 'unset';
			window.removeEventListener('mousemove', this.onDrag);
			window.removeEventListener('mouseup', this.onDragEnd);

			setTimeout(() => {
				this.$emit('dragend');
				this.isDragging = false;
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
	width: 1px;
	height: 1px;
}
</style>
