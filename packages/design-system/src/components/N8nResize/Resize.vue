<template>
  <div :class="$style.resize">
    <div @mousedown="resizerMove" class="resizer right" />
    <div @mousedown="resizerMove" class="resizer left" />
    <div @mousedown="resizerMove" class="resizer top" />
    <div @mousedown="resizerMove" class="resizer bottom" />
    <div @mousedown="resizerMove" class="resizer top-left" />
    <div @mousedown="resizerMove" class="resizer top-right" />
    <div @mousedown="resizerMove" class="resizer bottom-left" />
    <div @mousedown="resizerMove" class="resizer bottom-right" />
    <slot></slot>
  </div>
</template>

<script lang="ts">
export default {
  name: 'n8n-resize',
  props: ['resizer', 'minWidth', 'minHeight'],
  data() {
    return {
      currentResizer: null,
      prevX: 0,
      prevY: 0,
      original_height: 0,
      original_width: 0,
      original_x: 0,
      original_mouse_x: 0,
      original_y: 0,
      original_mouse_y: 0,
    }
  },
  methods: {
    resizerMove(e) {
      this.currentResizer = e.target;

      this.prevX = e.clientX;
      this.prevY = e.clientY;

      this.original_height = parseInt(getComputedStyle(this.resizer, null).getPropertyValue('height').replace('px', ''));
      this.original_width = parseInt(getComputedStyle(this.resizer, null).getPropertyValue('width').replace('px', ''));
      this.original_x = this.resizer.getBoundingClientRect().left;
      this.original_y = this.resizer.getBoundingClientRect().top;
      this.original_mouse_x = e.pageX;
      this.original_mouse_y = e.pageY;

      window.addEventListener('mousemove', this.mouseMove);
      window.addEventListener('mouseup', this.mouseUp);
    },
    mouseMove(e) {
      if (this.currentResizer.classList.contains('bottom-right')) {
        const width = this.original_width + (e.pageX - this.original_mouse_x);
        const height = this.original_height + (e.pageY - this.original_mouse_y);
        if (width > this.minWidth) {
          this.resizer.style.width = width + 'px'
        }
        if (height > this.minHeight) {
          this.resizer.style.height = height + 'px'
        }
      } else if (this.currentResizer.classList.contains('bottom-left')) {
        const height = this.original_height + (e.pageY - this.original_mouse_y);
        const width = this.original_width - (e.pageX - this.original_mouse_x);
        const left = this.resizer.offsetLeft - (this.prevX - e.clientX)
        
        if (height > this.minHeight) {
          this.resizer.style.height = height + 'px'
        }
        
        if (width > this.minWidth) {
          this.resizer.style.width = width + 'px'
          this.resizer.style.left = left + 'px'
        }
      } else if (this.currentResizer.classList.contains('top-right')) {
        const width = this.original_width + (e.pageX - this.original_mouse_x);
        const height = this.original_height - (e.pageY - this.original_mouse_y);
        const top = this.resizer.offsetTop - (this.prevY - e.clientY);
        
        if (width > this.minWidth) {
          this.resizer.style.width = width + 'px';
        }
        
        if (height > this.minHeight) {
          this.resizer.style.height = height + 'px';
          this.resizer.style.top = top + 'px';
        }
      } else if (this.currentResizer.classList.contains('top-left')) {
        const width = this.original_width - (e.pageX - this.original_mouse_x);
        const height = this.original_height - (e.pageY - this.original_mouse_y);
        const top = this.resizer.offsetTop - (this.prevY - e.clientY);
        const left = this.resizer.offsetLeft - (this.prevX - e.clientX);

        if (width > this.minWidth) {
          this.resizer.style.width = width + 'px';
          this.resizer.style.left = left + 'px';
        }
        if (height > this.minHeight) {
          this.resizer.style.height = height + 'px';
          this.resizer.style.top = top + 'px';
        }
      } else if (this.currentResizer.classList.contains('right')) {
        const width = this.original_width + (e.pageX - this.original_mouse_x);
        
        if (width > this.minWidth) {
          this.resizer.style.width = width + 'px';
        }
      } else if (this.currentResizer.classList.contains('left')) {
        const width = this.original_width - (e.pageX - this.original_mouse_x)
        const left = this.resizer.offsetLeft - (this.prevX - e.clientX);
        
        if (width > this.minWidth) {
          this.resizer.style.width = width + 'px'
          this.resizer.style.left = left + 'px'
        }
      } else if (this.currentResizer.classList.contains('top')) {
        const height = this.original_height - (e.pageY - this.original_mouse_y);
        const top = this.resizer.offsetTop - (this.prevY - e.clientY);
        
        if (height > this.minHeight) {
          this.resizer.style.height = height + 'px'
          this.resizer.style.top = top + 'px'
        }    
      } else if (this.currentResizer.classList.contains('bottom')) {
        const height = this.original_height + (e.pageY - this.original_mouse_y)
        if (height > this.minHeight) {
          this.resizer.style.height = height + 'px'
        }
      }

      this.prevX = e.clientX;
      this.prevY = e.clientY;

      const height = parseInt(getComputedStyle(this.resizer, null).getPropertyValue('height').replace('px', ''));
      const width = parseInt(getComputedStyle(this.resizer, null).getPropertyValue('width').replace('px', ''));
      const top = parseInt(getComputedStyle(this.resizer, null).getPropertyValue('top').replace('px', ''));
      const left = parseInt(getComputedStyle(this.resizer, null).getPropertyValue('left').replace('px', ''));
     
      this.$emit('onResizeStart', { width, height, top, left});
    },
    mouseUp() {
      this.$emit('onResizeEnd', true);
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

<style lang="scss">
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