/**
 * Component watchers
 */
const mixin = {
  watch: {
    // Recalculate settings
    currentBreakpoint () {
      // this.prepareSettings()
      this.$emit('breakpoint', { breakpoint: this.currentBreakpoint })
    },

    // Watch current slide change
    currentSlide () {
      this.prepareSlidesClasses()

      // Set start time of slide
      this.autoplayStartTimestamp = (this.settings.autoplay) ? +new Date() : null

      this.$emit('after-change', { currentSlide: this.currentSlide })
    },

    // Watch drag distance change
    dragDistance () {
      if (this.isMouseDown) {
        const { rtl } = this.settings
        const dragDistance = this.dragDistance * (rtl ? -1 : 1)

        if (dragDistance > this.swipeDistance && this.canGoToPrev) {
          this.goToPrev()
          this.handleMouseUp()
        }

        if (dragDistance < -1 * this.swipeDistance && this.canGoToNext) {
          this.goToNext()
          this.handleMouseUp()
        }
      }
    },

    isAutoplayPaused (nevValue) {
      if (nevValue) {
        // Store current slide remaining time and disable auto play mode
        this.remaining = this.settings.autoplaySpeed - (+new Date() - this.autoplayStartTimestamp)
        this.disableAutoPlay()
        this.clearAutoPlayPause()
      } else {
        // Go to next after remaining time and rerun auto play mode
        this.autoplayTimeout = setTimeout(() => {
          this.clearAutoPlayPause()
          this.goToNext()
          this.toggleAutoPlay()
        }, this.remaining)
      }
    },

    'settings.autoplay' () {
      this.toggleAutoPlay()
    },

    'settings.fade' () {
      this.toggleFade()
    },

    'settings.unagile' () {
      // this.prepareSlides()
      // this.prepareCarousel()
    },

    widthSlide () {
      for (let i = 0; i < this.countSlidesAll; i++) {
        // console.log(this.widthSlide)
        // console.log(this.settings)
        this.slidesAll[i].style.width = `${this.widthSlide}${(this.widthSlide !== 'auto') ? 'px' : ''}`
      }
    },

    // Watch window width change
    widthWindow (newValue, oldValue) {
      if (oldValue) {
        this.prepareCarousel()
        this.toggleFade()
      }
    }
  }
}

export default mixin
