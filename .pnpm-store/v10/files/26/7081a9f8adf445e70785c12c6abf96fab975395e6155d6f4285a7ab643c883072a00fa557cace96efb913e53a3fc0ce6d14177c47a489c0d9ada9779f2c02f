/**
 * Throttle methods by lodash
 */

import throttle from 'lodash.throttle'

const mixin = {
  created () {
    this.goTo = throttle(this.goTo, this.throttleDelay)
    this.getWidth = throttle(this.getWidth, 500)
  }
}

export default mixin
