<template>
  <div :class="$style.resize">
    <div @mousedown="resizerMove" class="resizer w" />
    <div @mousedown="resizerMove" class="resizer e" />
    <div @mousedown="resizerMove" class="resizer n" />
    <div @mousedown="resizerMove" class="resizer s" />
    <div @mousedown="resizerMove" class="resizer nw" />
    <div @mousedown="resizerMove" class="resizer ne" />
    <div @mousedown="resizerMove" class="resizer sw" />
    <div @mousedown="resizerMove" class="resizer se" />
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
      isResizing: false,
      prevX: 0,
      prevY: 0,
    }
  },
  methods: {
    resizerMove(e) {
      this.currentResizer = e.target;
      this.isResizing = true;

      this.prevX = e.clientX;
      this.prevY = e.clientY;

      window.addEventListener('mousemove', this.mouseMove);
      window.addEventListener('mouseup', this.mouseUp);
    },
    mouseMove(e) {
      const rect = this.resizer.getBoundingClientRect();

        if (this.currentResizer.classList.contains('se')) {
          this.resizer.style.width = rect.width - (this.prevX - e.clientX) + 'px';
          this.resizer.style.height = rect.height - (this.prevY - e.clientY) + 'px';
        } else if (this.currentResizer.classList.contains('sw')) {
          if (rect.width > this.minWidth && rect.height > this.minHeight) {
            this.resizer.style.width = rect.width + (this.prevX - e.clientX) + 'px';
            this.resizer.style.height = rect.height - (this.prevY - e.clientY) + 'px';
            this.resizer.style.left = rect.left - (this.prevX - e.clientX) + 'px';
          } else {
            this.resizer.style.width = rect.width + (this.prevX - e.clientX) + 'px';
            this.resizer.style.height = rect.height - (this.prevY - e.clientY) + 'px';
          }
        } else if (this.currentResizer.classList.contains('ne')) {
          if (rect.width > this.minWidth && rect.height > this.minHeight) { 
            this.resizer.style.width = rect.width - (this.prevX - e.clientX) + 'px';
            this.resizer.style.height = rect.height + (this.prevY - e.clientY) + 'px';
            this.resizer.style.top = rect.top + (this.prevX - e.clientX) + 'px';
          } else {
            this.resizer.style.height = rect.height + (this.prevY - e.clientY) + 'px';
            this.resizer.style.width = rect.width - (this.prevX - e.clientX) + 'px';
          }
        } else if (this.currentResizer.classList.contains('nw')) {
          if (rect.width > this.minWidth && rect.height > this.minHeight) { 
            this.resizer.style.width = rect.width + (this.prevX - e.clientX) + 'px';
            this.resizer.style.height = rect.height + (this.prevY - e.clientY) + 'px';
            this.resizer.style.top = rect.top - (this.prevY - e.clientY) + 'px';
            this.resizer.style.left = rect.left - (this.prevX - e.clientX) + 'px';
          } else {
            this.resizer.style.width = rect.width + (this.prevX - e.clientX) + 'px';
            this.resizer.style.height = rect.height + (this.prevY - e.clientY) + 'px';
          }
        } else if (this.currentResizer.classList.contains('w')) {
          if (rect.width < this.minWidth) {
            this.resizer.style.width = rect.width + (this.prevX - e.clientX) + 'px';
          } else {
            this.resizer.style.width = rect.width - (this.prevX - e.clientX) + 'px';
          }
        } else if (this.currentResizer.classList.contains('e')) {
          if (rect.width > this.minWidth) {
            this.resizer.style.left = rect.left - (this.prevX - e.clientX) + 'px';
            this.resizer.style.width = rect.width + (this.prevX - e.clientX) + 'px';
          } else {
            this.resizer.style.width = rect.width + (this.prevX - e.clientX) + 'px';
          }
        } else if (this.currentResizer.classList.contains('n')) {
          if (rect.height > this.minHeight) {
            this.resizer.style.top = rect.top - (this.prevY - e.clientY) + 'px';
            this.resizer.style.height = rect.height + (this.prevY - e.clientY) + 'px';
          } else {
            this.resizer.style.height = rect.height + (this.prevY - e.clientY) + 'px';
          }       
        } else if (this.currentResizer.classList.contains('s')) {
          if (rect.height < this.minHeight) {
            this.resizer.style.height = rect.height + (this.prevY - e.clientY) + 'px';
          } else {
            this.resizer.style.height = rect.height - (this.prevY - e.clientY) + 'px';
          }
        }

        this.prevX = e.clientX;
        this.prevY = e.clientY;
    },
    mouseUp() {
      window.removeEventListener('mousemove', this.mouseMove);
      window.removeEventListener('mouseup', this.mouseUp);
      this.isResizing = false;
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

.w {
  width: 12px;
  height: 100%;
  top: -2px;
  right: -2px;
  cursor: ew-resize;
}

.n {
  width: 100%;
  height: 12px;
  top: -2px;
  left: -2px;
  cursor:  ns-resize;
}

.s {
  width: 100%;
  height: 12px;
  bottom: -2px;
  left: -2px;
  cursor: ns-resize;
}

.e {
  width: 12px;
  height: 100%;
  top: -2px;
  left: -2px;
  cursor: ew-resize;
}

.nw {
  width: 12px;
  height: 12px;
  top: -3px;
  left: -3px;
  cursor: nw-resize;
  z-index: 3;
}

.ne {
  width: 12px;
  height: 12px;
  top: -3px;
  right: -3px;
  cursor: ne-resize;
  z-index: 3;
}

.sw {
  width: 12px;
  height: 12px;
  bottom: -3px;
  left: -3px;
  cursor: sw-resize;
  z-index: 3;
}

.se {
  width: 12px;
  height: 12px;
  bottom: -3px;
  right: -3px;
  cursor: se-resize;
  z-index: 3;
}
</style>