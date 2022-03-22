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
    }
  },
  methods: {
    resizerMove(e) {
      var vm = this;
      var currentResizer = e.target;
      this.isResizing = true;
      
      let prevX = e.clientX;
      let prevY = e.clientY;

      window.addEventListener('mousemove', mousemove);
      window.addEventListener('mouseup', mouseup);
 
      function mousemove(e){
        const rect = vm.resizer.getBoundingClientRect();

        if (currentResizer.classList.contains('se')) {
          vm.resizer.style.width = rect.width - (prevX - e.clientX) + 'px';
          vm.resizer.style.height = rect.height - (prevY - e.clientY) + 'px';
        } 
        else if (currentResizer.classList.contains('sw')) {
          if (rect.width > vm.minWidth && rect.height > vm.minHeight) {
            vm.resizer.style.width = rect.width + (prevX - e.clientX) + 'px';
            vm.resizer.style.height = rect.height - (prevY - e.clientY) + 'px';
            vm.resizer.style.left = rect.left - (prevX - e.clientX) + 'px';
          } else {
            vm.resizer.style.width = rect.width + (prevX - e.clientX) + 'px';
            vm.resizer.style.height = rect.height - (prevY - e.clientY) + 'px';
          }
        }

        else if (currentResizer.classList.contains('ne')) {
          if (rect.width > vm.minWidth && rect.height > vm.minHeight) { 
            vm.resizer.style.width = rect.width - (prevX - e.clientX) + 'px';
            vm.resizer.style.height = rect.height + (prevY - e.clientY) + 'px';
            vm.resizer.style.top = rect.top + (prevX - e.clientX) + 'px';
          } else {
            vm.resizer.style.height = rect.height + (prevY - e.clientY) + 'px';
            vm.resizer.style.width = rect.width - (prevX - e.clientX) + 'px';
          }

        }

         else if (currentResizer.classList.contains('nw')) {
           if (rect.width > vm.minWidth && rect.height > vm.minHeight) { 
          vm.resizer.style.width = rect.width + (prevX - e.clientX) + 'px';
          vm.resizer.style.height = rect.height + (prevY - e.clientY) + 'px';
          vm.resizer.style.top = rect.top - (prevY - e.clientY) + 'px';
          vm.resizer.style.left = rect.left - (prevX - e.clientX) + 'px';
           } else {
             vm.resizer.style.width = rect.width + (prevX - e.clientX) + 'px';
            vm.resizer.style.height = rect.height + (prevY - e.clientY) + 'px';
           }
        } 
        
        else if (currentResizer.classList.contains('w')) {
           if (rect.width < vm.minWidth) {
               vm.resizer.style.width = rect.width + (prevX - e.clientX) + 'px';
           } else {
             vm.resizer.style.width = rect.width - (prevX - e.clientX) + 'px';
           }
        } else if (currentResizer.classList.contains('e')) {
          if (rect.width > vm.minWidth) {
            vm.resizer.style.left = rect.left - (prevX - e.clientX) + 'px';
             vm.resizer.style.width = rect.width + (prevX - e.clientX) + 'px';
          } else {
             vm.resizer.style.width = rect.width + (prevX - e.clientX) + 'px';
          }
        } else if (currentResizer.classList.contains('n')) {
          if (rect.height > vm.minHeight) {
            vm.resizer.style.top = rect.top - (prevY - e.clientY) + 'px';
            vm.resizer.style.height = rect.height + (prevY - e.clientY) + 'px';
          } else {
            vm.resizer.style.height = rect.height + (prevY - e.clientY) + 'px';
          }       
        } else if (currentResizer.classList.contains('s')) {
          if (rect.height < vm.minHeight) {
            vm.resizer.style.height = rect.height + (prevY - e.clientY) + 'px';
          } else {
            vm.resizer.style.height = rect.height - (prevY - e.clientY) + 'px';
          }
        }

        prevX = e.clientX;
        prevY = e.clientY;
      }

      function mouseup() {
        window.removeEventListener('mousemove', mousemove);
        window.removeEventListener('mouseup', mouseup);
        vm.isResizing = false;
      }
    }
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
  padding: var(--spacing-s) var(--spacing-s) 0;
  z-index: 2;
}
</style>

<style lang="scss">
.resizer {
  position: absolute;
  z-index: 2;
}

.w {
  width: 10px;
  height: 100%;
  top: -2px;
  right: -2px;
  cursor: ew-resize;
}

.n {
  width: 100%;
  height: 10px;
  top: -2px;
  left: -2px;
  cursor:  ns-resize;
}

.s {
  width: 100%;
  height: 10px;
  bottom: -2px;
  left: -2px;
  cursor: ns-resize;
}

.e {
  width: 10px;
  height: 100%;
  top: -2px;
  left: -2px;
  cursor: ew-resize;
}

.nw {
  width: 10px;
  height: 10px;
  top: -2px;
  left: -2px;
  cursor: nw-resize;
}

.ne {
  width: 10px;
  height: 10px;
  top: -2px;
  right: -2px;
  cursor: ne-resize;
}

.sw {
  width: 10px;
  height: 10px;
  bottom: -2px;
  left: -2px;
  cursor: sw-resize;
}

.se {
  width: 10px;
  height: 10px;
  bottom: -2px;
  right: -2px;
  cursor: se-resize;
}
</style>
