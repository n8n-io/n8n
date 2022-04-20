<template>
	<div :class="$style.resize">
		<div @mousedown="resizerMove" class="resizer right" :class="!isResizingEnabled ? 'no-cursor' : ''" />
		<div @mousedown="resizerMove" class="resizer left" :class="!isResizingEnabled ? 'no-cursor' : ''"/>
		<div @mousedown="resizerMove" class="resizer top" :class="!isResizingEnabled ? 'no-cursor' : ''"/>
		<div @mousedown="resizerMove" class="resizer bottom" :class="!isResizingEnabled ? 'no-cursor' : ''"/>
		<div @mousedown="resizerMove" class="resizer top-left" :class="!isResizingEnabled ? 'no-cursor' : ''"/>
		<div @mousedown="resizerMove" class="resizer top-right" :class="!isResizingEnabled ? 'no-cursor' : ''"/>
		<div @mousedown="resizerMove" class="resizer bottom-left" :class="!isResizingEnabled ? 'no-cursor' : ''"/>
		<div @mousedown="resizerMove" class="resizer bottom-right" :class="!isResizingEnabled ? 'no-cursor' : ''"/>
		<slot></slot>
	</div>
</template>

<script lang="ts">
export default {
	name: 'n8n-resize',
	props: {
		resizer: {
			type: HTMLDivElement,
		},
		minWidth: {
			type: Number,
		},
		minHeight: {
			type: Number,
		},
		isResizingEnabled: {
			type: Boolean,
			default: true,
		},
	},
	data() {
		return {
			currentResizer: null,
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
			this.currentResizer = e.target;

			this.x = e.pageX;
			this.y = e.pageY;
			this.width = 0;
			this.height = 0;

			if (this.isResizingEnabled) {
				window.addEventListener('mousemove', this.mouseMove);
				window.addEventListener('mouseup', this.mouseUp);
				this.$emit('resizestart');
			}
		},
		mouseMove(e) {
			e.preventDefault();
			e.stopPropagation();
			let width = 0;
			let height = 0;
			let top = false;
			let left = false;

			const hasDir = (dir) => {
				return [...this.currentResizer.classList].find((v) => typeof v === 'string' && v.includes(dir));
			};

			if (hasDir('right')) {
				width = e.pageX - this.x;
			}
			if (hasDir('left')) {
				width = this.x - e.pageX;
				left = true;
			}
			if (hasDir('top')) {
				height = this.y - e.pageY;
				top = true;
			}
			if (hasDir('bottom')) {
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
		},
	},
	mounted() {
		this.currentResizer = null;
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

.no-cursor {
	cursor: default!important;
}
</style>
