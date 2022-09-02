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
		sticky: {
			type: Boolean,
		},
		stickyOffset: {
			type: Number,
			default: 0,
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

			if (target && this.isDragging) {
				const dim = target.getBoundingClientRect();

				this.hovering = e.clientX >= dim.left && e.clientX <= dim.right && e.clientY >= dim.top && e.clientY <= dim.bottom;

				if (this.sticky && this.hovering) {
					this.$store.commit('ui/setDraggableStickyPos', [dim.left + this.stickyOffset, dim.top + this.stickyOffset]);
				}
			}
		},
		onMouseUp(e: MouseEvent) {
			if (this.activeDrop) {
				const data = this.$store.getters['ui/draggableData'];
				this.$emit('drop', data);
			}
		},
	},
	watch: {
		activeDrop(active) {
			this.$store.commit('ui/setDraggableCanDrop', active);
		},
	},
});
</script>
