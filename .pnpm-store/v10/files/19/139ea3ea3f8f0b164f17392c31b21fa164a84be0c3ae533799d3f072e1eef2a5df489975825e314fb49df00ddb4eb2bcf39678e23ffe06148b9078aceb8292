'use strict'
const bench = require('fastbench')
const fastRedact = require('..')

const censorFn = (v) => v + '.'
const censorFnWithPath = (v, p) => v + '.' + p

const noir = require('pino-noir')(['aa.b.c'])
const redactNoSerialize = fastRedact({ paths: ['ab.b.c'], serialize: false })
const redactNoSerializeRestore = fastRedact({ paths: ['ac.b.c'], serialize: false })
const noirWild = require('pino-noir')(['ad.b.*'])
const redactWildNoSerialize = fastRedact({ paths: ['ae.b.*'], serialize: false })
const redactWildNoSerializeRestore = fastRedact({ paths: ['af.b.*'], serialize: false })
const redactIntermediateWildNoSerialize = fastRedact({ paths: ['ag.*.c'], serialize: false })
const redactIntermediateWildNoSerializeRestore = fastRedact({ paths: ['ah.*.c'], serialize: false })
const noirJSONSerialize = require('pino-noir')(['aj.b.c']) // `ai` used in pure JSON test.
const redact = fastRedact({ paths: ['ak.b.c'] })
const noirWildJSONSerialize = require('pino-noir')(['al.b.c'])
const redactWild = fastRedact({ paths: ['am.b.*'] })
const redactIntermediateWild = fastRedact({ paths: ['an.*.c'] })
const redactIntermediateWildMatchWildOutcome = fastRedact({ paths: ['ao.*.c', 'ao.*.b', 'ao.*.a'] })
const redactStaticMatchWildOutcome = fastRedact({ paths: ['ap.b.c', 'ap.d.a', 'ap.d.b', 'ap.d.c'] })
const noirCensorFunction = require('pino-noir')(['aq.b.*'], censorFn)
const redactCensorFunction = fastRedact({ paths: ['ar.b.*'], censor: censorFn, serialize: false })
const redactIntermediateWildCensorFunction = fastRedact({ paths: ['as.*.c'], censor: censorFn, serialize: false })
const redactCensorFunctionWithPath = fastRedact({ paths: ['at.d.b'], censor: censorFn, serialize: false })
const redactWildCensorFunctionWithPath = fastRedact({ paths: ['au.d.*'], censor: censorFnWithPath, serialize: false })
const redactIntermediateWildCensorFunctionWithPath = fastRedact({ paths: ['av.*.c'], censorFnWithPath, serialize: false })
const redactMultiWild = fastRedact({ paths: ['aw.*.*'] })
const redactMultiWildCensorFunction = fastRedact({ paths: ['ax.*.*'], censor: censorFn, serialize: false })

const getObj = (outerKey) => ({
  [outerKey]: {
    b: {
      c: 's'
    },
    d: {
      a: 's',
      b: 's',
      c: 's'
    }
  }
})

const max = 500

var run = bench([
  function benchNoirV2 (cb) {
    const obj = getObj('aa')
    for (var i = 0; i < max; i++) {
      noir.aa(obj.aa)
    }
    setImmediate(cb)
  },
  function benchFastRedact (cb) {
    const obj = getObj('ab')
    for (var i = 0; i < max; i++) {
      redactNoSerialize(obj)
    }
    setImmediate(cb)
  },
  function benchFastRedactRestore (cb) {
    const obj = getObj('ac')
    for (var i = 0; i < max; i++) {
      redactNoSerializeRestore(obj)
      redactNoSerializeRestore.restore(obj)
    }
    setImmediate(cb)
  },
  function benchNoirV2Wild (cb) {
    const obj = getObj('ad')
    for (var i = 0; i < max; i++) {
      noirWild.ad(obj.ad)
    }
    setImmediate(cb)
  },
  function benchFastRedactWild (cb) {
    const obj = getObj('ae')
    for (var i = 0; i < max; i++) {
      redactWildNoSerialize(obj)
    }
    setImmediate(cb)
  },
  function benchFastRedactWildRestore (cb) {
    const obj = getObj('af')
    for (var i = 0; i < max; i++) {
      redactWildNoSerializeRestore(obj)
      redactWildNoSerializeRestore.restore(obj)
    }
    setImmediate(cb)
  },
  function benchFastRedactIntermediateWild (cb) {
    const obj = getObj('ag')
    for (var i = 0; i < max; i++) {
      redactIntermediateWildNoSerialize(obj)
    }
    setImmediate(cb)
  },
  function benchFastRedactIntermediateWildRestore (cb) {
    const obj = getObj('ah')
    for (var i = 0; i < max; i++) {
      redactIntermediateWildNoSerializeRestore(obj)
      redactIntermediateWildNoSerializeRestore.restore(obj)
    }
    setImmediate(cb)
  },
  function benchJSONStringify (cb) {
    const obj = getObj('ai')
    for (var i = 0; i < max; i++) {
      JSON.stringify(obj)
    }
    setImmediate(cb)
  },
  function benchNoirV2Serialize (cb) {
    const obj = getObj('aj')
    for (var i = 0; i < max; i++) {
      noirJSONSerialize.aj(obj.aj)
      JSON.stringify(obj)
    }
    setImmediate(cb)
  },
  function benchFastRedactSerialize (cb) {
    const obj = getObj('ak')
    for (var i = 0; i < max; i++) {
      redact(obj)
    }
    setImmediate(cb)
  },
  function benchNoirV2WildSerialize (cb) {
    const obj = getObj('al')
    for (var i = 0; i < max; i++) {
      noirWildJSONSerialize.al(obj.al)
      JSON.stringify(obj)
    }
    setImmediate(cb)
  },
  function benchFastRedactWildSerialize (cb) {
    const obj = getObj('am')
    for (var i = 0; i < max; i++) {
      redactWild(obj)
    }
    setImmediate(cb)
  },
  function benchFastRedactIntermediateWildSerialize (cb) {
    const obj = getObj('an')
    for (var i = 0; i < max; i++) {
      redactIntermediateWild(obj)
    }
    setImmediate(cb)
  },
  function benchFastRedactIntermediateWildMatchWildOutcomeSerialize (cb) {
    const obj = getObj('ao')
    for (var i = 0; i < max; i++) {
      redactIntermediateWildMatchWildOutcome(obj)
    }
    setImmediate(cb)
  },
  function benchFastRedactStaticMatchWildOutcomeSerialize (cb) {
    const obj = getObj('ap')
    for (var i = 0; i < max; i++) {
      redactStaticMatchWildOutcome(obj)
    }
    setImmediate(cb)
  },
  function benchNoirV2CensorFunction (cb) {
    const obj = getObj('aq')
    for (var i = 0; i < max; i++) {
      noirCensorFunction.aq(obj.aq)
    }
    setImmediate(cb)
  },
  function benchFastRedactCensorFunction (cb) {
    const obj = getObj('ar')
    for (var i = 0; i < max; i++) {
      redactCensorFunction(obj)
    }
    setImmediate(cb)
  },
  function benchFastRedactCensorFunctionIntermediateWild (cb) {
    const obj = getObj('as')
    for (var i = 0; i < max; i++) {
      redactIntermediateWildCensorFunction(obj)
    }
    setImmediate(cb)
  },
  function benchFastRedactCensorFunctionWithPath (cb) {
    const obj = getObj('at')
    for (var i = 0; i < max; i++) {
      redactCensorFunctionWithPath(obj)
    }
    setImmediate(cb)
  },
  function benchFastRedactWildCensorFunctionWithPath (cb) {
    const obj = getObj('au')
    for (var i = 0; i < max; i++) {
      redactWildCensorFunctionWithPath(obj)
    }
    setImmediate(cb)
  },
  function benchFastRedactIntermediateWildCensorFunctionWithPath (cb) {
    const obj = getObj('av')
    for (var i = 0; i < max; i++) {
      redactIntermediateWildCensorFunctionWithPath(obj)
    }
    setImmediate(cb)
  },
  function benchFastRedactMultiWild (cb) {
    const obj = getObj('aw')
    for (var i = 0; i < max; i++) {
      redactMultiWild(obj)
    }
    setImmediate(cb)
  },
  function benchFastRedactMultiWildCensorFunction (cb) {
    const obj = getObj('ax')
    for (var i = 0; i < max; i++) {
      redactMultiWildCensorFunction(obj)
    }
    setImmediate(cb)
  }
], 500)

run(run)
