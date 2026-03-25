'use strict'

function propagate(events, source, dest) {
  if (arguments.length < 3) {
    dest = source
    source = events
    events = undefined
  }

  // events should be an array or object
  const eventsIsObject = typeof events === 'object'
  if (events && !eventsIsObject) events = [events]

  if (eventsIsObject) {
    return explicitPropagate(events, source, dest)
  }

  const shouldPropagate = eventName =>
    events === undefined || events.includes(eventName)

  const oldEmit = source.emit

  // Returns true if the event had listeners, false otherwise.
  // https://nodejs.org/api/events.html#events_emitter_emit_eventname_args
  source.emit = (eventName, ...args) => {
    const oldEmitHadListeners = oldEmit.call(source, eventName, ...args)

    let destEmitHadListeners = false
    if (shouldPropagate(eventName)) {
      destEmitHadListeners = dest.emit(eventName, ...args)
    }

    return oldEmitHadListeners || destEmitHadListeners
  }

  function end() {
    source.emit = oldEmit
  }

  return {
    end,
  }
}

module.exports = propagate

function explicitPropagate(events, source, dest) {
  let eventsIn
  let eventsOut
  if (Array.isArray(events)) {
    eventsIn = events
    eventsOut = events
  } else {
    eventsIn = Object.keys(events)
    eventsOut = eventsIn.map(function(key) {
      return events[key]
    })
  }

  const listeners = eventsOut.map(function(event) {
    return function() {
      const args = Array.prototype.slice.call(arguments)
      args.unshift(event)
      dest.emit.apply(dest, args)
    }
  })

  listeners.forEach(register)

  return {
    end,
  }

  function register(listener, i) {
    source.on(eventsIn[i], listener)
  }

  function unregister(listener, i) {
    source.removeListener(eventsIn[i], listener)
  }

  function end() {
    listeners.forEach(unregister)
  }
}
