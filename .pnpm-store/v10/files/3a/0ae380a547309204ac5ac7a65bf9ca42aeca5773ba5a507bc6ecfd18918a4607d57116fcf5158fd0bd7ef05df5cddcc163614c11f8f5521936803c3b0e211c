'use strict'

/* eslint-disable no-var */

const bench = require('fastbench')
const retimer = require('./')
const max = 10000

function benchSetTimeout (done) {
  const timers = new Array(max)
  let completed = 0
  let toReschedule = 20

  schedule()

  function complete () {
    if (++completed === max) {
      done()
    }
  }

  function schedule () {
    for (var i = 0; i < max; i++) {
      if (timers[i]) {
        clearTimeout(timers[i])
      }
      timers[i] = setTimeout(complete, 50)
    }
    if (--toReschedule > 0) {
      setTimeout(schedule, 10)
    }
  }
}

function benchRetimer (done) {
  const timers = new Array(max)
  let completed = 0
  let toReschedule = 20

  schedule()

  function complete () {
    if (++completed === max) {
      done()
    }
  }

  function schedule () {
    for (var i = 0; i < max; i++) {
      if (timers[i]) {
        timers[i].reschedule(50)
      } else {
        timers[i] = retimer(complete, 50)
      }
    }
    if (--toReschedule > 0) {
      setTimeout(schedule, 10)
    }
  }
}

const run = bench([
  benchSetTimeout,
  benchRetimer
], 100)

run(run)
