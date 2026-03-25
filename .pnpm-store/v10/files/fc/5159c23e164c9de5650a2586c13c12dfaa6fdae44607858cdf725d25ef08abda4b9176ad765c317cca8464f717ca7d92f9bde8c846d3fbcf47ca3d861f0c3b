<template>
  <div
    :class="{'agile--ssr': isSSR, 'agile--auto-play': settings.autoplay, 'agile--disabled': settings.unagile, 'agile--fade': settings.fade && !settings.unagile, 'agile--rtl': settings.rtl, 'agile--no-nav-buttons': !settings.navButtons}"
    class="agile"
    @touchstart="() => {}"
  >
    <div
      ref="list"
      class="agile__list"
    >
      <div
        ref="track"
        :style="{transform: `translate(${translateX + marginX}px)`, transition: `transform ${settings.timing} ${transitionDelay}ms`}"
        class="agile__track"
        @mouseout="handleMouseOut('track')"
        @mouseover="handleMouseOver('track')"
      >
        <div
          v-show="slidesCloned"
          ref="slidesClonedBefore"
          class="agile__slides agile__slides--cloned"
        >
          <slot/>
        </div>

        <div
          ref="slides"
          class="agile__slides agile__slides--regular"
        >
          <slot/>
        </div>

        <div
          v-show="slidesCloned"
          ref="slidesClonedAfter"
          class="agile__slides agile__slides--cloned"
        >
          <slot/>
        </div>
      </div>
    </div>

    <div
      v-if="$slots.caption"
      class="agile__caption"
    >
      <slot name="caption"/>
    </div>

    <div
      v-if="!settings.unagile && (settings.navButtons || settings.dots)"
      class="agile__actions"
    >
      <button
        v-if="settings.navButtons && !settings.unagile"
        ref="prevButton"
        :disabled="!canGoToPrev"
        aria-label="Previous"
        class="agile__nav-button agile__nav-button--prev"
        type="button"
        @click="goToPrev(), restartAutoPlay()"
      >
        <slot name="prevButton">
          ←
        </slot>
      </button>

      <ul
        v-if="settings.dots && !settings.unagile"
        ref="dots"
        class="agile__dots"
      >
        <li
          v-for="n in countSlides"
          :key="n"
          :class="{'agile__dot--current': n - 1 === currentSlide}"
          class="agile__dot"
          @mouseout="handleMouseOut('dot')"
          @mouseover="handleMouseOver('dot')"
        >
          <button
            type="button"
            @click="goTo(n - 1), restartAutoPlay()"
          >
            {{ n }}
          </button>
        </li>
      </ul>

      <button
        v-if="settings.navButtons && !settings.unagile"
        ref="nextButton"
        :disabled="!canGoToNext"
        aria-label="Next"
        class="agile__nav-button agile__nav-button--next"
        type="button"
        @click="goToNext(), restartAutoPlay()"
      >
        <slot name="nextButton">
          →
        </slot>
      </button>
    </div>
  </div>
</template>

<script>
  import handlers from './mixins/handlers'
  import helpers from './mixins/helpers'
  import methods from './mixins/methods'
  import preparations from './mixins/preparations'
  import settings from './mixins/settings'
  import throttle from './mixins/throttle'
  import watchers from './mixins/watchers'

  export default {
    name: 'agile',

    mixins: [handlers, helpers, methods, preparations, settings, throttle, watchers],

    emits: ['before-change', 'after-change', 'breakpoint'],

    data () {
      return {
        autoplayInterval: null,
        autoplayRemaining: null,
        autoplayStartTimestamp: null,
        autoplayTimeout: null,
        currentSlide: null,
        dragDistance: 0,
        dragStartX: 0,
        dragStartY: 0,
        isAutoplayPaused: false,
        isMouseDown: false,
        slides: [],
        slidesClonedAfter: [],
        slidesClonedBefore: [],
        isSSR: (typeof window === 'undefined'),
        transitionDelay: 0,
        translateX: 0,
        widthWindow: 0,
        widthContainer: 0
      }
    },

    computed: {
      breakpoints: function () {
        return (!this.initialSettings.responsive) ? [] : this.initialSettings.responsive.map(item => item.breakpoint)
      },

      canGoToPrev: function () {
        return (this.settings.infinite || this.currentSlide > 0)
      },

      canGoToNext: function () {
        return (this.settings.infinite || this.currentSlide < this.countSlides - 1)
      },

      countSlides: function () {
        return (this.isSSR) ? this.htmlCollectionToArray(this.$slots.default).length : this.slides.length
      },

      countSlidesAll: function () {
        return this.slidesAll.length
      },

      currentBreakpoint: function () {
        const breakpoints = this.breakpoints.map(item => item).reverse()
        return (this.initialSettings.mobileFirst) ? breakpoints.find(item => item < this.widthWindow) || 0 : breakpoints.find(item => item > this.widthWindow) || null
      },

      marginX: function () {
        if (this.settings.unagile) {
          return 0
        }

        let marginX = (this.slidesCloned) ? this.countSlides * this.widthSlide : 0

        // Center mode margin
        if (this.settings.centerMode) {
          marginX -= (Math.floor(this.settings.slidesToShow / 2) - +(this.settings.slidesToShow % 2 === 0)) * this.widthSlide
        }

        return (this.settings.rtl) ? marginX : -1 * marginX
      },

      slidesCloned: function () {
        return (!this.settings.unagile && !this.settings.fade && this.settings.infinite)
      },

      slidesAll: function () {
        return (this.slidesCloned) ? [...this.slidesClonedBefore, ...this.slides, ...this.slidesClonedAfter] : this.slides
      },

      widthSlide: function () {
        return (!this.settings.unagile) ? this.widthContainer / this.settings.slidesToShow : 'auto'
      }
    },

    mounted () {
      // Windows resize listener
      window.addEventListener('resize', this.getWidth)

      // Mouse and touch events
      this.$refs.track.addEventListener('touchstart', this.handleMouseDown)
      this.$refs.track.addEventListener('touchend', this.handleMouseUp)
      this.$refs.track.addEventListener('touchmove', this.handleMouseMove)
      this.$refs.track.addEventListener('mousedown', this.handleMouseDown)
      this.$refs.track.addEventListener('mouseup', this.handleMouseUp)
      this.$refs.track.addEventListener('mousemove', this.handleMouseMove)

      // Init
      this.isSSR = false
      this.reload()
    },

    // Vue 3
    beforeUnmount () {
      this.destroy()
    },

    methods: {
      destroy () {
        window.removeEventListener('resize', this.getWidth)

        this.$refs.track.removeEventListener('touchstart', this.handleMouseDown)
        this.$refs.track.removeEventListener('touchend', this.handleMouseUp)
        this.$refs.track.removeEventListener('touchmove', this.handleMouseMove)
        this.$refs.track.removeEventListener('mousedown', this.handleMouseDown)
        this.$refs.track.removeEventListener('mouseup', this.handleMouseUp)
        this.$refs.track.removeEventListener('mousemove', this.handleMouseMove)

        this.disableAutoPlay()
      },

      // Return current breakpoint
      getCurrentBreakpoint () {
        return this.currentBreakpoint
      },

      // Return settings for current breakpoint
      getCurrentSettings () {
        return this.settings
      },

      // Return current slide index
      getCurrentSlide () {
        return this.currentSlide
      },

      // Return initial settings
      getInitialSettings () {
        return this.initialSettings
      },

      // Go to slide
      goTo (n, transition = true, asNav = false) {
        // Break goTo() if unagile is active
        if (this.settings.unagile) {
          return false
        }

        if (!asNav) {
          this.settings.asNavFor.forEach(carousel => {
            if (carousel) {
              carousel.goTo(n, transition, true)
            }
          })
        }

        let slideNextReal = n

        if (transition) {
          if (this.settings.infinite && n < 0) {
            slideNextReal = this.countSlides - 1
          } else if (n >= this.countSlides) {
            slideNextReal = 0
          }

          this.$emit('before-change', { currentSlide: this.currentSlide, nextSlide: slideNextReal })

          this.currentSlide = slideNextReal

          if (n !== slideNextReal) {
            setTimeout(() => {
              this.goTo(slideNextReal, false)
            }, this.settings.speed)
          }
        }

        const translateX = (!this.settings.fade) ? n * this.widthSlide * this.settings.slidesToScroll : 0
        this.transitionDelay = (transition) ? this.speed : 0

        if (this.infinite || (this.currentSlide + this.slidesToShow <= this.countSlides)) {
          this.translateX = (this.settings.rtl) ? translateX : -1 * translateX
        }
      },

      // Go to next slide
      goToNext () {
        if (this.canGoToNext) {
          this.goTo(this.currentSlide + 1)
        }
      },

      // Go to previous slide
      goToPrev () {
        if (this.canGoToPrev) {
          this.goTo(this.currentSlide - 1)
        }
      },

      // Reload carousel
      reload () {
        this.getWidth()
        this.prepareSlides()
        this.prepareCarousel()
        this.toggleFade()
        this.toggleAutoPlay()
      }
    }
  }
</script>

<style>
  .agile {
    position: relative;
  }

  .agile--ssr .agile__slides--cloned {
    display: none
  }

  .agile--ssr .agile__slides > * {
    overflow: hidden;
    width: 0
  }

  .agile--ssr .agile__slides > *:first-child {
    width: 100%
  }

  .agile--rtl .agile__track,
  .agile--rtl .agile__slides,
  .agile--rtl .agile__actions,
  .agile--rtl .agile__dots {
    flex-direction: row-reverse;
  }

  .agile:focus, .agile:active, .agile *:focus, .agile *:active {
    outline: none;
  }

  .agile__list {
    display: block;
    overflow: hidden;
    position: relative;
    width: 100%;
  }

  .agile__track {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
  }

  .agile__actions {
    display: flex;
    justify-content: space-between;
  }

  .agile--no-nav-buttons .agile__actions {
    justify-content: center;
  }

  .agile__slides {
    align-items: center;
    display: flex;
    flex-direction: row;
    flex-grow: 1;
    flex-shrink: unset;
    flex-wrap: nowrap;
    justify-content: flex-start;
  }

  .agile--disabled .agile__slides {
    display: block;
    width: 100%;
  }

  .agile__slide {
    display: block;
    flex-grow: 1;
    flex-shrink: 0;
  }

  .agile__slide,
  .agile__slide * {
    -webkit-user-drag: none;
  }

  .agile--fade .agile__slide {
    opacity: 0;
    position: relative;
    z-index: 0;
  }

  .agile--fade .agile__slide--active {
    opacity: 1;
    z-index: 2;
  }

  .agile--fade .agile__slide--expiring {
    opacity: 1;
    transition-duration: 0s;
    z-index: 1;
  }

  .agile__nav-button[disabled] {
    cursor: default;
  }

  .agile__dots {
    align-items: center;
    display: flex;
    list-style: none;
    padding: 0;
    white-space: nowrap;
  }

  .agile__dot button {
    cursor: pointer;
    display: block;
    font-size: 0;
    line-height: 0;
  }
</style>
