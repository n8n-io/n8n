/**
 * Carousel preparation methods
 */
const mixin = {
  methods: {
    /**
     * Prepare slides classes and styles
     */
    prepareSlides () {
      this.slides = this.htmlCollectionToArray(this.$refs.slides.children)

      // Probably timeout needed
      if (this.slidesCloned) {
        this.slidesClonedBefore = this.htmlCollectionToArray(this.$refs.slidesClonedBefore.children)
        this.slidesClonedAfter = this.htmlCollectionToArray(this.$refs.slidesClonedAfter.children)
      }

      for (const slide of this.slidesAll) {
        slide.classList.add('agile__slide')
      }
    },

    /**
     *  Prepare slides active/current classes
     */
    prepareSlidesClasses () {
      if (this.currentSlide === null) {
        return false
      }

      // Remove active & current classes
      for (let i = 0; i < this.countSlides; i++) {
        this.slides[i].classList.remove('agile__slide--active')
        this.slides[i].classList.remove('agile__slide--current')
      }

      // Add active & current class for current slide
      setTimeout(() => this.slides[this.currentSlide].classList.add('agile__slide--active'), this.changeDelay)

      let start = (this.slidesCloned) ? this.countSlides + this.currentSlide : this.currentSlide

      if (this.centerMode) {
        start -= (Math.floor(this.settings.slidesToShow / 2) - +(this.settings.slidesToShow % 2 === 0))
      }

      // To account for the combination of infinite = false and centerMode = true, ensure we don't overrun the bounds of the slide count.
      for (let i = Math.max(start, 0); i < Math.min(start + this.settings.slidesToShow, this.countSlides); i++) {
        this.slidesAll[i].classList.add('agile__slide--current')
      }
    },

    /**
     * Prepare carousel styles
     */
    prepareCarousel () {
      // Prepare track
      if (this.settings.unagile) {
        this.translateX = 0
      } else {
        if (this.currentSlide === null && this.countSlides) {
          this.currentSlide = this.settings.initialSlide
        }

        if (this.currentSlide > this.countSlides) {
          this.currentSlide = this.countSlides - 1
        }

        this.goTo(this.currentSlide, false, false)
      }
    }
  }
}

export default mixin
