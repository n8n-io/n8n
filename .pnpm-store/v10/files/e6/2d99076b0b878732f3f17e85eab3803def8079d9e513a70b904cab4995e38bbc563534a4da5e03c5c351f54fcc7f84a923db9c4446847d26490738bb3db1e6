/**
 * All not public methods doesn't classified elsewhere
 */
const mixin = {
  methods: {
    clearAutoPlayPause () {
      clearTimeout(this.autoplayTimeout)
      this.autoplayRemaining = null
    },

    disableAutoPlay () {
      clearInterval(this.autoplayInterval)
      this.autoplayInterval = null
    },

    disableScroll () {
      document.ontouchmove = e => e.preventDefault()
    },

    enableScroll () {
      document.ontouchmove = () => true
    },

    restartAutoPlay () {
      this.disableAutoPlay()
      this.toggleAutoPlay()
    },

    toggleAutoPlay () {
      const enabled = (!this.settings.unagile && this.settings.autoplay)

      if (!this.autoplayInterval && enabled) {
        this.autoplayInterval = setInterval(() => {
          if (!document.hidden) {
            if (!this.canGoToNext) {
              this.disableAutoPlay()
            } else {
              this.goToNext()
            }
          }
        }, this.settings.autoplaySpeed)
      } else {
        this.disableAutoPlay()
      }
    },

    toggleFade () {
      const enabled = (!this.settings.unagile && this.settings.fade)

      for (let i = 0; i < this.countSlides; i++) {
        this.slides[i].style.transition = (enabled) ? 'opacity ' + this.settings.timing + ' ' + this.settings.speed + 'ms' : 'none'
        this.slides[i].style.transform = (enabled) ? `translate(-${i * this.widthSlide}px)` : 'none'
      }
    }
  }
}

export default mixin
