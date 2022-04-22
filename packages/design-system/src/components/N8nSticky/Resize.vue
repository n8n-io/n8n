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
	},
	data() {
		return {
			dir: '',
			height: 0,
			width: 0,
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
			this.width = 0;
			this.height = 0;

			window.addEventListener('mousemove', this.mouseMove);
			window.addEventListener('mouseup', this.mouseUp);
			this.$emit('resizestart');
		},
		mouseMove(e) {
			e.preventDefault();
			e.stopPropagation();
			let width = 0;
			let height = 0;
			let top = false;
			let left = false;

			if (this.dir.includes('right')) {
				width = e.pageX - this.x;
			}
			if (this.dir.includes('left')) {
				width = this.x - e.pageX;
				left = true;
			}
			if (this.dir.includes('top')) {
				height = this.y - e.pageY;
				top = true;
			}
			if (this.dir.includes('bottom')) {
				height = e.pageY - this.y;
			}

			this.$emit('resize', { width: width - this.width, height: height - this.height, left, top });
			this.height = height;
			this.width = width;
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
