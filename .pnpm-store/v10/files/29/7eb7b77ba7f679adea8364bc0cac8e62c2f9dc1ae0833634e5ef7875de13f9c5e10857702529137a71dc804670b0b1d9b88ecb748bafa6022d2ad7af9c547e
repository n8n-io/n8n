/**
 * Handlers methods for mouse/touch events
 */
const mixin = {
  methods: {
    handleMouseDown (e) {
      this.isMouseDown = true

      if (e.type.indexOf('touch') !== -1) {
        this.dragStartX = e.touches[0].clientX
        this.dragStartY = e.touches[0].clientY
      }
      if (e.type.indexOf('mouse') !== -1) {
        this.dragStartX = e.clientX
        this.dragStartY = e.clientY
      }
    },

    handleMouseMove (e) {
      let positionX
      let positionY
      if (e.type.indexOf('touch') !== -1) {
        positionX = e.touches[0].clientX
        positionY = e.touches[0].clientY
      }
      if (e.type.indexOf('mouse') !== -1) {
        positionX = e.clientX
        positionY = e.clientY
      }
      const dragDistanceX = Math.abs(positionX - this.dragStartX)
      const dragDistanceY = Math.abs(positionY - this.dragStartY)
      if (dragDistanceX > 3 * dragDistanceY) {
        this.disableScroll()
        this.dragDistance = positionX - this.dragStartX
      }
    },

    handleMouseUp () {
      this.isMouseDown = false
      this.enableScroll()
    },

    handleMouseOver (element) {
      if (this.settings.autoplay) {
        if ((element === 'dot' && this.settings.pauseOnDotsHover) || (element === 'track' && this.settings.pauseOnHover)) {
          this.isAutoplayPaused = true
        }
      }
    },

    handleMouseOut (element) {
      if (this.settings.autoplay) {
        if ((element === 'dot' && this.settings.pauseOnDotsHover) || (element === 'track' && this.settings.pauseOnHover)) {
          this.isAutoplayPaused = false
        }
      }
    }
  }
}

export default mixin
