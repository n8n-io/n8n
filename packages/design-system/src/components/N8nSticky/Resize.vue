<template>
	<div :class="$style.resize">
		<div v-if="isResizingEnabled" @mousedown="resizerMove" data-dir="right" :class="[$style.resizer, $style.right]" />
		<div v-if="isResizingEnabled" @mousedown="resizerMove" data-dir="left" :class="[$style.resizer, $style.left]" />
		<div v-if="isResizingEnabled" @mousedown="resizerMove" data-dir="top" :class="[$style.resizer, $style.top]" />
		<div v-if="isResizingEnabled" @mousedown="resizerMove" data-dir="bottom" :class="[$style.resizer, $style.bottom]" />
		<div v-if="isResizingEnabled" @mousedown="resizerMove" data-dir="top-left" :class="[$style.resizer, $style.topLeft]" />
		<div v-if="isResizingEnabled" @mousedown="resizerMove" data-dir="top-right" :class="[$style.resizer, $style.topRight]" />
		<div v-if="isResizingEnabled" @mousedown="resizerMove" data-dir="bottom-left" :class="[$style.resizer, $style.bottomLeft]" />
		<div v-if="isResizingEnabled" @mousedown="resizerMove" data-dir="bottom-right" :class="[$style.resizer, $style.bottomRight]" />
		<slot></slot>
	</div>
</template>

<script lang="ts">
const cursorMap = {
	right: 'ew-resize',
	top: 'ns-resize',
	bottom: 'ns-resize',
	left: 'ew-resize',
	'top-left': 'nw-resize',
	'top-right' : 'ne-resize',
	'bottom-left': 'sw-resize',
	'bottom-right': 'se-resize',
};

function closestNumber(value: number, divisor: number): number {
	let q = parseInt(value / divisor);
	let n1 = divisor * q;

	let n2 = (value * divisor) > 0 ?
		(divisor * (q + 1)) : (divisor * (q - 1));

	if (Math.abs(value - n1) < Math.abs(value - n2))
		return n1;

	return n2;
}

function getSize(delta, min, virtual, gridSize): number {
	const target = closestNumber(virtual, gridSize);
	if (target >= min && virtual > 0) {
		return target;
	}

	return min;
};

import Vue from 'vue';

export default Vue.extend({
	name: 'n8n-resize',
	props: {
		isResizingEnabled: {
			type: Boolean,
			default: true,
		},
		height: {
			type: Number,
		},
		width: {
			type: Number,
		},
		minHeight: {
			type: Number,
		},
		minWidth: {
			type: Number,
		},
		scale: {
			type: Number,
			default: 1,
		},
		gridSize: {
			type: Number,
		},
	},
	data() {
		return {
			dir: '',
			dHeight: 0,
			dWidth: 0,
			vHeight: 0,
			vWidth: 0,
			x: 0,
			y: 0,
		};
	},
	methods: {
		resizerMove(e) {
			e.preventDefault();
			e.stopPropagation();

			const targetResizer = e.target;
			this.dir = targetResizer.dataset.dir;
			document.body.style.cursor = cursorMap[this.dir];

			this.x = e.pageX;
			this.y = e.pageY;
			this.dWidth = 0;
			this.dHeight = 0;
			this.vHeight = this.height;
			this.vWidth = this.width;

			window.addEventListener('mousemove', this.mouseMove);
			window.addEventListener('mouseup', this.mouseUp);
			this.$emit('resizestart');
		},
		mouseMove(e) {
			e.preventDefault();
			e.stopPropagation();
			let dWidth = 0;
			let dHeight = 0;
			let top = false;
			let left = false;

			if (this.dir.includes('right')) {
				dWidth = e.pageX - this.x;
			}
			if (this.dir.includes('left')) {
				dWidth = this.x - e.pageX;
				left = true;
			}
			if (this.dir.includes('top')) {
				dHeight = this.y - e.pageY;
				top = true;
			}
			if (this.dir.includes('bottom')) {
				dHeight = e.pageY - this.y;
			}

			const deltaWidth = (dWidth - this.dWidth) / this.scale;
			const deltaHeight = (dHeight - this.dHeight) / this.scale;

			this.vHeight = this.vHeight + deltaHeight;
			this.vWidth = this.vWidth + deltaWidth;
			const height = getSize(deltaHeight, this.minHeight, this.vHeight, this.gridSize);
			const width = getSize(deltaWidth, this.minWidth, this.vWidth, this.gridSize);

			const dX = left && width !== this.width ? -1 * (width - this.width) : 0;
			const dY = top && height !== this.height ? -1 * (height - this.height): 0;

			this.$emit('resize', { height, width, dX, dY });
			this.dHeight = dHeight;
			this.dWidth = dWidth;
		},
		mouseUp(e) {
			e.preventDefault();
			e.stopPropagation();
			this.$emit('resizeend');
			window.removeEventListener('mousemove', this.mouseMove);
			window.removeEventListener('mouseup', this.mouseUp);
			document.body.style.cursor = 'unset';
			this.dir = '';
		},
	},
});
</script>

<style lang="scss" module>
.resize {
	position: absolute;
	width: 100%;
	height: 100%;
	z-index: 2;
}

.resizer {
	position: absolute;
	z-index: 2;
}

.right {
	width: 12px;
	height: 100%;
	top: -2px;
	right: -2px;
	cursor: ew-resize;
}

.top {
	width: 100%;
	height: 12px;
	top: -2px;
	left: -2px;
	cursor:  ns-resize;
}

.bottom {
	width: 100%;
	height: 12px;
	bottom: -2px;
	left: -2px;
	cursor: ns-resize;
}

.left {
	width: 12px;
	height: 100%;
	top: -2px;
	left: -2px;
	cursor: ew-resize;
}

.topLeft {
	width: 12px;
	height: 12px;
	top: -3px;
	left: -3px;
	cursor: nw-resize;
	z-index: 3;
}

.topRight {
	width: 12px;
	height: 12px;
	top: -3px;
	right: -3px;
	cursor: ne-resize;
	z-index: 3;
}

.bottomLeft {
	width: 12px;
	height: 12px;
	bottom: -3px;
	left: -3px;
	cursor: sw-resize;
	z-index: 3;
}

.bottomRight {
	width: 12px;
	height: 12px;
	bottom: -3px;
	right: -3px;
	cursor: se-resize;
	z-index: 3;
}
</style>
