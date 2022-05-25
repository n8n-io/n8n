<template>
	<div
		:class="{[$style.dragging]: isDragging }"
		@mousedown="onDragStart"
	>
		<slot :isDragging="isDragging"></slot>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
	data() {
		return {
			isDragging: false,
		};
	},
	methods: {
		onDragStart(e: MouseEvent) {
			e.preventDefault();
			e.stopPropagation();
			this.isDragging = true;

			this.$emit('dragstart');
			document.body.style.cursor = 'grabbing';

			window.addEventListener('mousemove', this.onDrag);
			window.addEventListener('mouseup', this.onDragEnd);
		},
		onDrag(e: MouseEvent) {
			e.preventDefault();
			e.stopPropagation();

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
</style>
