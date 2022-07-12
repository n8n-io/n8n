<template>
	<div ref="target">
		<slot :droppable="droppable" :activeDrop="activeDrop"></slot>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
	props: {
		type: {
			type: String,
		},
		disabled: {
			type: Boolean,
		},
	},
	data() {
		return {
			hovering: false,
		};
	},
	mounted() {
		window.addEventListener('mousemove', this.onMouseMove);
		window.addEventListener('mouseup', this.onMouseUp);
	},
	destroyed() {
		window.removeEventListener('mousemove', this.onMouseMove);
		window.removeEventListener('mouseup', this.onMouseUp);
	},
	computed: {
		isDragging(): boolean {
			return this.$store.getters['ui/isDraggableDragging'];
		},
		draggableType(): string {
			return this.$store.getters['ui/draggableType'];
		},
		droppable(): boolean {
			return !this.disabled && this.isDragging && this.draggableType === this.type;
		},
		activeDrop(): boolean {
			return this.droppable && this.hovering;
		},
	},
	methods: {
		onMouseMove(e: MouseEvent) {
			const target = this.$refs.target as HTMLElement;

			if (target) {
				const dim = target.getBoundingClientRect();

				this.hovering = e.clientX >= dim.left && e.clientX <= dim.right && e.clientY >= dim.top && e.clientY <= dim.bottom;
			}
		},
		onMouseUp(e: MouseEvent) {

		},
	},
	watch: {
		activeDrop(active) {
			this.$store.commit('ui/setDraggableCanDrop', active);
		},
	},
});
</script>
