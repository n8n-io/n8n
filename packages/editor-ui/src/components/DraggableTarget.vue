<template>
	<div ref="target">
		<slot :droppable="droppable" :active-drop="activeDrop"></slot>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import { mapStores } from 'pinia';
import { useNDVStore } from '@/stores/ndv.store';
import { v4 as uuid } from 'uuid';
import type { XYPosition } from '@/Interface';

export default defineComponent({
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
			type: Array as PropType<number[]>,
			default: () => [0, 0],
		},
		stickyOrigin: {
			type: String as PropType<'top-left' | 'center'>,
			default: 'top-left',
		},
	},
	data() {
		return {
			hovering: false,
			dimensions: null as DOMRect | null,
			id: uuid(),
		};
	},
	computed: {
		...mapStores(useNDVStore),
		isDragging(): boolean {
			return this.ndvStore.isDraggableDragging;
		},
		draggableType(): string {
			return this.ndvStore.draggableType;
		},
		draggableDimensions(): DOMRect | null {
			return this.ndvStore.draggable.dimensions;
		},
		droppable(): boolean {
			return !this.disabled && this.isDragging && this.draggableType === this.type;
		},
		activeDrop(): boolean {
			return this.droppable && this.hovering;
		},
		stickyPosition(): XYPosition | null {
			if (this.disabled || !this.sticky || !this.hovering || !this.dimensions) {
				return null;
			}

			if (this.stickyOrigin === 'center') {
				return [
					this.dimensions.left +
						this.stickyOffset[0] +
						this.dimensions.width / 2 -
						(this.draggableDimensions?.width ?? 0) / 2,
					this.dimensions.top +
						this.stickyOffset[1] +
						this.dimensions.height / 2 -
						(this.draggableDimensions?.height ?? 0) / 2,
				];
			}

			return [
				this.dimensions.left + this.stickyOffset[0],
				this.dimensions.top + this.stickyOffset[1],
			];
		},
	},
	watch: {
		activeDrop(active) {
			if (active) {
				this.ndvStore.setDraggableTarget({ id: this.id, stickyPosition: this.stickyPosition });
			} else if (this.ndvStore.draggable.activeTarget?.id === this.id) {
				// Only clear active target if it is this one
				this.ndvStore.setDraggableTarget(null);
			}
		},
	},
	mounted() {
		window.addEventListener('mousemove', this.onMouseMove);
		window.addEventListener('mouseup', this.onMouseUp);
	},

	beforeUnmount() {
		window.removeEventListener('mousemove', this.onMouseMove);
		window.removeEventListener('mouseup', this.onMouseUp);
	},
	methods: {
		onMouseMove(e: MouseEvent) {
			const targetRef = this.$refs.target as HTMLElement | undefined;

			if (targetRef && this.isDragging) {
				const dim = targetRef.getBoundingClientRect();

				this.dimensions = dim;
				this.hovering =
					e.clientX >= dim.left &&
					e.clientX <= dim.right &&
					e.clientY >= dim.top &&
					e.clientY <= dim.bottom;
			}
		},
		onMouseUp() {
			if (this.activeDrop) {
				const data = this.ndvStore.draggableData;
				this.$emit('drop', data);
			}
		},
	},
});
</script>
