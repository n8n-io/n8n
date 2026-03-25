'use strict'

const { kConnected, kSize } = require('../../core/symbols')

class CompatWeakRef {
  constructor (value) {
    this.value = value
  }

  deref () {
    return this.value[kConnected] === 0 && this.value[kSize] === 0
      ? undefined
      : this.value
  }
}

class CompatFinalizer {
  constructor (finalizer) {
    this.finalizer = finalizer
  }

  register (dispatcher, key) {
    if (dispatcher.on) {
      dispatcher.on('disconnect', () => {
        if (dispatcher[kConnected] === 0 && dispatcher[kSize] === 0) {
          this.finalizer(key)
        }
      })
    }
  }

  unregister (key) {}
}

module.exports = function () {
  // FIXME: remove workaround when the Node bug is backported to v18
  // https://github.com/nodejs/node/issues/49344#issuecomment-1741776308
  if (process.env.NODE_V8_COVERAGE && process.version.startsWith('v18')) {
    process._rawDebug('Using compatibility WeakRef and FinalizationRegistry')
    return {
      WeakRef: CompatWeakRef,
      FinalizationRegistry: CompatFinalizer
    }
  }
  return { WeakRef, FinalizationRegistry }
}
