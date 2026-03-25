const { addAbortListener } = require('../core/util')
const { RequestAbortedError } = require('../core/errors')

const kListener = Symbol('kListener')
const kSignal = Symbol('kSignal')

function abort (self) {
  if (self.abort) {
    self.abort()
  } else {
    self.onError(new RequestAbortedError())
  }
}

function addSignal (self, signal) {
  self[kSignal] = null
  self[kListener] = null

  if (!signal) {
    return
  }

  if (signal.aborted) {
    abort(self)
    return
  }

  self[kSignal] = signal
  self[kListener] = () => {
    abort(self)
  }

  addAbortListener(self[kSignal], self[kListener])
}

function removeSignal (self) {
  if (!self[kSignal]) {
    return
  }

  if ('removeEventListener' in self[kSignal]) {
    self[kSignal].removeEventListener('abort', self[kListener])
  } else {
    self[kSignal].removeListener('abort', self[kListener])
  }

  self[kSignal] = null
  self[kListener] = null
}

module.exports = {
  addSignal,
  removeSignal
}
