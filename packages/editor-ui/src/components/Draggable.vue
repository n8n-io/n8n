<template>
	<component
		:is="tag"
		:class="{ [$style.dragging]: isDragging }"
		@mousedown="onDragStart"
		ref="wrapper"
	>
		<slot :isDragging="isDragging"></slot>

		<Teleport to="body">
			<div ref="draggable" :class="$style.draggable" :style="draggableStyle" v-show="isDragging">
				<slot name="preview" :canDrop="canDrop" :el="draggingEl"></slot>
			</div>
		</Teleport>
	</component>
</template>

<script lang="ts">
import { XYPosition } from '@/Interface';
import { useNDVStore } from '@/stores/ndv';
import { mapStores } from 'pinia';
import Vue from 'vue';

// @ts-ignore
import Teleport from 'vue2-teleport';

export default Vue.extend({
	name: 'draggable',
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
		const draggablePosition = {
			x: -100,
			y: -100,
		};

		return {
			isDragging: false,
			draggablePosition,
			draggingEl: null as null | HTMLElement,
			draggableStyle: {
				transform: `translate(${draggablePosition.x}px, ${draggablePosition.y}px)`,
			},
			animationFrameId: 0,
		};
	},
	computed: {
		...mapStores(useNDVStore),
		canDrop(): boolean {
			return this.ndvStore.canDraggableDrop;
		},
		stickyPosition(): XYPosition | null {
			return this.ndvStore.draggableStickyPos;
		},
	},
	methods: {
		setDraggableStyle() {
			this.draggableStyle = {
				transform: `translate(${this.draggablePosition.x}px, ${this.draggablePosition.y}px)`,
			};
		},
		onDragStart(e: MouseEvent) {
			if (this.disabled) {
				return;
			}

			this.draggingEl = e.target as HTMLElement;
			if (this.targetDataKey && this.draggingEl.dataset?.target !== this.targetDataKey) {
				this.draggingEl = this.draggingEl.closest(
					`[data-target="${this.targetDataKey}"]`,
				) as HTMLElement;
			}

			if (this.targetDataKey && this.draggingEl?.dataset?.target !== this.targetDataKey) {
				return;
			}

			e.preventDefault();
			e.stopPropagation();

			this.isDragging = false;
			this.draggablePosition = { x: e.pageX, y: e.pageY };
			this.setDraggableStyle();

			window.addEventListener('mousemove', this.onDrag);
			window.addEventListener('mouseup', this.onDragEnd);

			// blur so that any focused inputs update value
			const activeElement = document.activeElement as HTMLElement;
			if (activeElement) {
				activeElement.blur();
			}
		},
		onDrag(e: MouseEvent) {
			e.preventDefault();
			e.stopPropagation();

			if (this.disabled) {
				return;
			}

			if (!this.isDragging) {
				this.isDragging = true;

				const data =
					this.targetDataKey && this.draggingEl ? this.draggingEl.dataset.value : this.data || '';
				this.ndvStore.draggableStartDragging({ type: this.type, data: data || '' });

				this.$emit('dragstart', this.draggingEl);
				document.body.style.cursor = 'grabbing';
			}

			this.animationFrameId = window.requestAnimationFrame(() => {
				if (this.canDrop && this.stickyPosition) {
					this.draggablePosition = { x: this.stickyPosition[0], y: this.stickyPosition[1] };
				} else {
					this.draggablePosition = { x: e.pageX, y: e.pageY };
				}
				this.setDraggableStyle();
				this.$emit('drag', this.draggablePosition);
			});
		},
		onDragEnd() {
			if (this.disabled) {
				return;
			}

			document.body.style.cursor = 'unset';
			window.removeEventListener('mousemove', this.onDrag);
			window.removeEventListener('mouseup', this.onDragEnd);
			window.cancelAnimationFrame(this.animationFrameId);

			setTimeout(() => {
				this.$emit('dragend', this.draggingEl);
				this.isDragging = false;
				this.draggingEl = null;
				this.ndvStore.draggableStopDragging();
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
	top: 0;
	left: 0;
}

.draggable-data-transfer {
	width: 0;
	height: 0;
}
</style>
