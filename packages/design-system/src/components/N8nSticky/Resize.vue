<template>
	<div :class="$style.resize">
		<div v-if="isResizingEnabled" @mousedown="resizerMove" class="resizer right"  />
		<div v-if="isResizingEnabled" @mousedown="resizerMove" class="resizer left" />
		<div v-if="isResizingEnabled" @mousedown="resizerMove" class="resizer top" />
		<div v-if="isResizingEnabled" @mousedown="resizerMove" class="resizer bottom" />
		<div v-if="isResizingEnabled" @mousedown="resizerMove" class="resizer top-left" />
		<div v-if="isResizingEnabled" @mousedown="resizerMove" class="resizer top-right" />
		<div v-if="isResizingEnabled" @mousedown="resizerMove" class="resizer bottom-left" />
		<div v-if="isResizingEnabled" @mousedown="resizerMove" class="resizer bottom-right" />
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

export default {
	name: 'n8n-resize',
	props: {
		isResizingEnabled: {
			type: Boolean,
			default: true,
		},
		height: {
			type: Number,
			default: 180,
		},
		width: {
			type: Number,
			default: 240,
		},
		minHeight: {
			type: Number,
			default: 80,
		},
		minWidth: {
			type: Number,
			default: 150,
		},
		scale: {
			type: Number,
			default: 1,
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
			this.dir = [...targetResizer.classList].find((c) => typeof c === 'string' && cursorMap[c]);
			document.body.style.cursor = cursorMap[this.dir];

			this.x = e.pageX;
			this.y = e.pageY;
			this.dWidth = 0;
			this.dHeight = 0;
			this.vHeight = this.height;// - this.minHeight;
			this.vWidth = this.width;// - this.minWidth;

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

			const gridSize = 20;

			const deltaWidth = (dWidth - this.dWidth) / this.scale;
			const deltaHeight = (dHeight - this.dHeight) / this.scale;

			function closestNumber(n, m) {
				// find the quotient
				let q = parseInt(n / m);

				// 1st possible closest number
				let n1 = m * q;

				// 2nd possible closest number
				let n2 = (n * m) > 0 ?
					(m * (q + 1)) : (m * (q - 1));

				// if true, then n1 is the
				// required closest number
				if (Math.abs(n - n1) < Math.abs(n - n2))
					return n1;

				// else n2 is the required
				// closest number
				return n2;
			}

			const getSize = (curr, delta, min, virtual) => {
				const target = closestNumber(virtual, gridSize);
				if (target >= min && virtual > 0) {
					return target;
				}

				return min;
			};

			this.vHeight = this.vHeight + deltaHeight;
			this.vWidth = this.vWidth + deltaWidth;
			const height = getSize(this.height, deltaHeight, this.minHeight, this.vHeight);
			const width = getSize(this.width, deltaWidth, this.minWidth, this.vWidth);

			if (left || top) {
				const dX = left && width !== this.width ? -1 * (width - this.width) : 0;
				const dY = top && height !== this.height ? -1 * (height - this.height): 0;

				this.$emit('resize', { height, width, dX, dY });
			}
			else {
				this.$emit('resize', { height, width });
			}
			this.dHeight = dHeight;
			this.dWidth = dWidth;
		},
		mouseUp(e) {
			e.preventDefault();
			e.stopPropagation();
			this.$emit('resizeend', true);
			window.removeEventListener('mousemove', this.mouseMove);
			window.removeEventListener('mouseup', this.mouseUp);
			document.body.style.cursor = 'unset';
			this.dir = '';
		},
	},
};
</script>

<style lang="scss" module>
.resize {
	position: absolute;
	width: 100%;
	height: 100%;
	z-index: 2;
}
</style>

<style lang="scss" scoped>
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

.top-left {
	width: 12px;
	height: 12px;
	top: -3px;
	left: -3px;
	cursor: nw-resize;
	z-index: 3;
}

.top-right {
	width: 12px;
	height: 12px;
	top: -3px;
	right: -3px;
	cursor: ne-resize;
	z-index: 3;
}

.bottom-left {
	width: 12px;
	height: 12px;
	bottom: -3px;
	left: -3px;
	cursor: sw-resize;
	z-index: 3;
}

.bottom-right {
	width: 12px;
	height: 12px;
	bottom: -3px;
	right: -3px;
	cursor: se-resize;
	z-index: 3;
}
</style>
