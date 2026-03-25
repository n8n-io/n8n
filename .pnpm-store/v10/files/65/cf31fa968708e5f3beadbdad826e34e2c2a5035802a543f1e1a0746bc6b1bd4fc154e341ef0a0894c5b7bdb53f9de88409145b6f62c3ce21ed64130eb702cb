'use strict'

const assert = require('assert')
const recorder = require('./recorder')
const {
  activate,
  disableNetConnect,
  enableNetConnect,
  removeAll: cleanAll,
} = require('./intercept')
const { loadDefs, define } = require('./scope')
const { back: debug } = require('./debug')
const { format } = require('util')
const path = require('path')

let _mode = null

let fs

try {
  fs = require('fs')
} catch (err) {
  // do nothing, probably in browser
}

/**
 * nock the current function with the fixture given
 *
 * @param {string}   fixtureName  - the name of the fixture, e.x. 'foo.json'
 * @param {object}   options      - [optional] extra options for nock with, e.x. `{ assert: true }`
 * @param {function} nockedFn     - [optional] callback function to be executed with the given fixture being loaded;
 *                                  if defined the function will be called with context `{ scopes: loaded_nocks || [] }`
 *                                  set as `this` and `nockDone` callback function as first and only parameter;
 *                                  if not defined a promise resolving to `{nockDone, context}` where `context` is
 *                                  aforementioned `{ scopes: loaded_nocks || [] }`
 *
 * List of options:
 *
 * @param {function} before       - a preprocessing function, gets called before nock.define
 * @param {function} after        - a postprocessing function, gets called after nock.define
 * @param {function} afterRecord  - a postprocessing function, gets called after recording. Is passed the array
 *                                  of scopes recorded and should return the array scopes to save to the fixture
 * @param {function} recorder     - custom options to pass to the recorder
 *
 */
function Back(fixtureName, options, nockedFn) {
  if (!Back.fixtures) {
    throw new Error(
      'Back requires nock.back.fixtures to be set\n' +
        'Ex:\n' +
        "\trequire(nock).back.fixtures = '/path/to/fixtures/'",
    )
  }

  if (typeof fixtureName !== 'string') {
    throw new Error('Parameter fixtureName must be a string')
  }

  if (arguments.length === 1) {
    options = {}
  } else if (arguments.length === 2) {
    // If 2nd parameter is a function then `options` has been omitted
    // otherwise `options` haven't been omitted but `nockedFn` was.
    if (typeof options === 'function') {
      nockedFn = options
      options = {}
    }
  }

  _mode.setup()

  const fixture = path.join(Back.fixtures, fixtureName)
  const context = _mode.start(fixture, options)

  const nockDone = function () {
    _mode.finish(fixture, options, context)
  }

  debug('context:', context)
  // If nockedFn is a function then invoke it, otherwise return a promise resolving to nockDone.
  if (typeof nockedFn === 'function') {
    nockedFn.call(context, nockDone)
  } else {
    return Promise.resolve({ nockDone, context })
  }
}

/*******************************************************************************
 *                                    Modes                                     *
 *******************************************************************************/

const wild = {
  setup: function () {
    cleanAll()
    recorder.restore()
    activate()
    enableNetConnect()
  },

  start: function () {
    return load() // don't load anything but get correct context
  },

  finish: function () {
    // nothing to do
  },
}

const dryrun = {
  setup: function () {
    recorder.restore()
    cleanAll()
    activate()
    //  We have to explicitly enable net connectivity as by default it's off.
    enableNetConnect()
  },

  start: function (fixture, options) {
    const contexts = load(fixture, options)

    enableNetConnect()
    return contexts
  },

  finish: function () {
    // nothing to do
  },
}

const record = {
  setup: function () {
    recorder.restore()
    recorder.clear()
    cleanAll()
    activate()
    disableNetConnect()
  },

  start: function (fixture, options) {
    if (!fs) {
      throw new Error('no fs')
    }
    const context = load(fixture, options)

    if (!context.isLoaded) {
      recorder.record({
        dont_print: true,
        output_objects: true,
        ...options.recorder,
      })

      context.isRecording = true
    }

    return context
  },

  finish: function (fixture, options, context) {
    if (context.isRecording) {
      let outputs = recorder.outputs()

      if (typeof options.afterRecord === 'function') {
        outputs = options.afterRecord(outputs)
      }

      outputs =
        typeof outputs === 'string' ? outputs : JSON.stringify(outputs, null, 4)
      debug('recorder outputs:', outputs)

      fs.mkdirSync(path.dirname(fixture), { recursive: true })
      fs.writeFileSync(fixture, outputs)
    }
  },
}

const update = {
  setup: function () {
    recorder.restore()
    recorder.clear()
    cleanAll()
    activate()
    disableNetConnect()
  },

  start: function (fixture, options) {
    if (!fs) {
      throw new Error('no fs')
    }
    const context = removeFixture(fixture)
    recorder.record({
      dont_print: true,
      output_objects: true,
      ...options.recorder,
    })

    context.isRecording = true

    return context
  },

  finish: function (fixture, options, context) {
    let outputs = recorder.outputs()

    if (typeof options.afterRecord === 'function') {
      outputs = options.afterRecord(outputs)
    }

    outputs =
      typeof outputs === 'string' ? outputs : JSON.stringify(outputs, null, 4)
    debug('recorder outputs:', outputs)

    fs.mkdirSync(path.dirname(fixture), { recursive: true })
    fs.writeFileSync(fixture, outputs)
  },
}

const lockdown = {
  setup: function () {
    recorder.restore()
    recorder.clear()
    cleanAll()
    activate()
    disableNetConnect()
  },

  start: function (fixture, options) {
    return load(fixture, options)
  },

  finish: function () {
    // nothing to do
  },
}

function load(fixture, options) {
  const context = {
    scopes: [],
    assertScopesFinished: function () {
      assertScopes(this.scopes, fixture)
    },
    query: function () {
      const nested = this.scopes.map(scope =>
        scope.interceptors.map(interceptor => ({
          method: interceptor.method,
          uri: interceptor.uri,
          basePath: interceptor.basePath,
          path: interceptor.path,
          queries: interceptor.queries,
          counter: interceptor.counter,
          body: interceptor.body,
          statusCode: interceptor.statusCode,
          optional: interceptor.optional,
        })),
      )

      return [].concat.apply([], nested)
    },
  }

  if (fixture && fixtureExists(fixture)) {
    let scopes = loadDefs(fixture)
    applyHook(scopes, options.before)

    scopes = define(scopes)
    applyHook(scopes, options.after)

    context.scopes = scopes
    context.isLoaded = true
  }

  return context
}

function removeFixture(fixture, options) {
  const context = {
    scopes: [],
    assertScopesFinished: function () {},
  }

  if (fixture && fixtureExists(fixture)) {
    /* istanbul ignore next - fs.unlinkSync is for node 10 support */
    fs.rmSync ? fs.rmSync(fixture) : fs.unlinkSync(fixture)
  }
  context.isLoaded = false
  return context
}

function applyHook(scopes, fn) {
  if (!fn) {
    return
  }

  if (typeof fn !== 'function') {
    throw new Error('processing hooks must be a function')
  }

  scopes.forEach(fn)
}

function fixtureExists(fixture) {
  if (!fs) {
    throw new Error('no fs')
  }

  return fs.existsSync(fixture)
}

function assertScopes(scopes, fixture) {
  const pending = scopes
    .filter(scope => !scope.isDone())
    .map(scope => scope.pendingMocks())

  if (pending.length) {
    assert.fail(
      format(
        '%j was not used, consider removing %s to rerecord fixture',
        [].concat(...pending),
        fixture,
      ),
    )
  }
}

const Modes = {
  wild, // all requests go out to the internet, dont replay anything, doesnt record anything

  dryrun, // use recorded nocks, allow http calls, doesnt record anything, useful for writing new tests (default)

  record, // use recorded nocks, record new nocks

  update, // allow http calls, record all nocks, don't use recorded nocks

  lockdown, // use recorded nocks, disables all http calls even when not nocked, doesnt record
}

Back.setMode = function (mode) {
  if (!(mode in Modes)) {
    throw new Error(`Unknown mode: ${mode}`)
  }

  Back.currentMode = mode
  debug('New nock back mode:', Back.currentMode)

  _mode = Modes[mode]
  _mode.setup()
}

Back.fixtures = null
Back.currentMode = null

module.exports = Back
