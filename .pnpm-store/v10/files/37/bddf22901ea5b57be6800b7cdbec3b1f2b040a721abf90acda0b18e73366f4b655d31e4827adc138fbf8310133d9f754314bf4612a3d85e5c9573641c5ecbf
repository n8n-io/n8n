/**
 * Component settings
 */

import orderBy from 'lodash.orderby'

const mixin = {
  props: {
    /**
     * Set the carousel to be the navigation of other carousels
     */
    asNavFor: {
      type: Array,
      default: function () {
        return []
      }
    },

    /**
     * Enable autoplay
     */
    autoplay: {
      type: Boolean,
      default: false
    },

    /**
     * Autoplay interval in milliseconds
     */
    autoplaySpeed: {
      type: Number,
      default: 3000
    },

    /**
     * Enable centered view when slidesToShow > 1
     */
    centerMode: {
      type: Boolean,
      default: false
    },

    /**
     * Slides padding in center mode
     */
    centerPadding: {
      type: String,
      default: '15%'
    },

    /**
     * Slide change delay in milliseconds
     */
    changeDelay: {
      type: Number,
      default: 0
    },

    /**
     * Enable dot indicators/pagination
     */
    dots: {
      type: Boolean,
      default: true
    },

    /**
     * Enable fade effect
     */
    fade: {
      type: Boolean,
      default: false
    },

    /**
     * Infinite loop sliding
     */
    infinite: {
      type: Boolean,
      default: true
    },

    /**
     * Index of slide to start on
     */
    initialSlide: {
      type: Number,
      default: 0
    },

    /**
     * Enable mobile first calculation for responsive settings
     */
    mobileFirst: {
      type: Boolean,
      default: true
    },

    /**
     * Enable prev/next navigation buttons
     */
    navButtons: {
      type: Boolean,
      default: true
    },

    /**
     * All settings as one object
     */
    options: {
      type: Object,
      default: () => null
    },

    /**
     * Pause autoplay when a dot is hovered
     */
    pauseOnDotsHover: {
      type: Boolean,
      default: false
    },

    /**
     * Pause autoplay when a slide is hovered
     */
    pauseOnHover: {
      type: Boolean,
      default: true
    },

    /**
     * Object containing breakpoints and settings objects
     */
    responsive: {
      type: Array,
      default: () => null
    },

    /**
     * Enable right-to-left mode
     */
    rtl: {
      type: Boolean,
      default: false
    },

    /**
     * Number of slides to scroll
     */
    slidesToScroll: {
      type: Number,
      default: 1
    },

    /**
     * Number of slides to show
     */
    slidesToShow: {
      type: Number,
      default: 1
    },

    /**
     * Slide animation speed in milliseconds
     */
    speed: {
      type: Number,
      default: 300
    },

    /**
     * Swipe distance
     */
    swipeDistance: {
      type: Number,
      default: 50
    },

    /**
     * Throttle delay in milliseconds
     */
    throttleDelay: {
      type: Number,
      default: 500
    },

    /**
     * Transition timing function
     * Available: ease, linear, ease-in, ease-out, ease-in-out
     */
    timing: {
      type: String,
      default: 'ease',
      validator: value => {
        return ['ease', 'linear', 'ease-in', 'ease-out', 'ease-in-out'].indexOf(value) !== -1
      }
    },

    /**
     * Disable Agile carousel
     */
    unagile: {
      type: Boolean,
      default: false
    }
  },

  computed: {
    // Initial settings based on props and options object
    initialSettings: function () {
      // options prop is excluded
      let { options, ...initialSettings } = this.$props

      // Join settings from options
      if (options) {
        initialSettings = { ...initialSettings, ...options }
      }

      // Sort breakpoints
      if (initialSettings.responsive) {
        initialSettings.responsive = orderBy(initialSettings.responsive, 'breakpoint')
      }

      return initialSettings
    },

    // Settings for current breakpoint
    settings: function () {
      const { responsive, ...settings } = this.initialSettings

      if (responsive) {
        responsive.forEach(option => {
          if (settings.mobileFirst ? option.breakpoint < this.widthWindow : option.breakpoint > this.widthWindow) {
            for (const key in option.settings) {
              settings[key] = option.settings[key]
            }
          }
        })
      }

      return settings
    }
  }
}

export default mixin
