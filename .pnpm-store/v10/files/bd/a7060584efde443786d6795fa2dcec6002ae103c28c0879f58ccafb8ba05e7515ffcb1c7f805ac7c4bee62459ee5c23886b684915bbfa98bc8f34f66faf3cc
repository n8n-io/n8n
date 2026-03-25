<template>
  <div
    class="resize-observer"
    tabindex="-1"
  />
</template>

<script>
import { nextTick } from 'vue'
import { getInternetExplorerVersion } from '../utils/compatibility'

let isIE

function initCompat () {
  if (!initCompat.init) {
    initCompat.init = true
    isIE = getInternetExplorerVersion() !== -1
  }
}

export default {
  name: 'ResizeObserver',

  props: {
    emitOnMount: {
      type: Boolean,
      default: false,
    },

    ignoreWidth: {
      type: Boolean,
      default: false,
    },

    ignoreHeight: {
      type: Boolean,
      default: false,
    },
  },

  emits: [
    'notify',
  ],

  mounted () {
    initCompat()
    nextTick(() => {
      this._w = this.$el.offsetWidth
      this._h = this.$el.offsetHeight
      if (this.emitOnMount) {
        this.emitSize()
      }
    })
    const object = document.createElement('object')
    this._resizeObject = object
    object.setAttribute('aria-hidden', 'true')
    object.setAttribute('tabindex', -1)
    object.onload = this.addResizeHandlers
    object.type = 'text/html'
    if (isIE) {
      this.$el.appendChild(object)
    }
    object.data = 'about:blank'
    if (!isIE) {
      this.$el.appendChild(object)
    }
  },

  beforeUnmount () {
    this.removeResizeHandlers()
  },

  methods: {
    compareAndNotify () {
      if ((!this.ignoreWidth && this._w !== this.$el.offsetWidth) || (!this.ignoreHeight && this._h !== this.$el.offsetHeight)) {
        this._w = this.$el.offsetWidth
        this._h = this.$el.offsetHeight
        this.emitSize()
      }
    },

    emitSize () {
      this.$emit('notify', {
        width: this._w,
        height: this._h,
      })
    },

    addResizeHandlers () {
      this._resizeObject.contentDocument.defaultView.addEventListener('resize', this.compareAndNotify)
      this.compareAndNotify()
    },

    removeResizeHandlers () {
      if (this._resizeObject && this._resizeObject.onload) {
        if (!isIE && this._resizeObject.contentDocument) {
          this._resizeObject.contentDocument.defaultView.removeEventListener('resize', this.compareAndNotify)
        }
        this.$el.removeChild(this._resizeObject)
        this._resizeObject.onload = null
        this._resizeObject = null
      }
    },
  },
}
</script>

<style scoped>
.resize-observer {
  position: absolute;
  top: 0;
  left: 0;
  z-index: -1;
  width: 100%;
  height: 100%;
  border: none;
  background-color: transparent;
  pointer-events: none;
  display: block;
  overflow: hidden;
  opacity: 0;
}

.resize-observer:deep(object) {
  display: block;
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  overflow: hidden;
  pointer-events: none;
  z-index: -1;
}
</style>
