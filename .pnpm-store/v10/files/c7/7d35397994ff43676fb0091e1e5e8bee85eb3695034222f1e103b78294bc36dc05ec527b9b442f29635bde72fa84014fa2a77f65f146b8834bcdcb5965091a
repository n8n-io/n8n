'use strict'

const test = require('tape').test

const commist = require('./')
const leven = require('./leven')

test('registering a command', function (t) {
  t.plan(2)

  const program = commist()

  program.register('hello', function (args) {
    t.deepEqual(args, ['a', '-x', '23'])
  })

  const result = program.parse(['hello', 'a', '-x', '23'])

  t.notOk(result, 'must return null, the command have been handled')
})

test('registering two commands', function (t) {
  t.plan(1)

  const program = commist()

  program.register('hello', function (args) {
    t.ok(false, 'must pick the right command')
  })

  program.register('world', function (args) {
    t.deepEqual(args, ['a', '-x', '23'])
  })

  program.parse(['world', 'a', '-x', '23'])
})

test('registering two commands (bis)', function (t) {
  t.plan(1)

  const program = commist()

  program.register('hello', function (args) {
    t.deepEqual(args, ['a', '-x', '23'])
  })

  program.register('world', function (args) {
    t.ok(false, 'must pick the right command')
  })

  program.parse(['hello', 'a', '-x', '23'])
})

test('registering two words commands', function (t) {
  t.plan(1)

  const program = commist()

  program.register('hello', function (args) {
    t.ok(false, 'must pick the right command')
  })

  program.register('hello world', function (args) {
    t.deepEqual(args, ['a', '-x', '23'])
  })

  program.parse(['hello', 'world', 'a', '-x', '23'])
})

test('registering two words commands (bis)', function (t) {
  t.plan(1)

  const program = commist()

  program.register('hello', function (args) {
    t.deepEqual(args, ['a', '-x', '23'])
  })

  program.register('hello world', function (args) {
    t.ok(false, 'must pick the right command')
  })

  program.parse(['hello', 'a', '-x', '23'])
})

test('registering ambiguous commands throws exception', function (t) {
  const program = commist()

  function noop () {}

  program.register('hello', noop)
  program.register('hello world', noop)
  program.register('hello world matteo', noop)

  try {
    program.register('hello world', noop)
    t.ok(false, 'must throw if double-registering the same command')
  } catch (err) {
  }

  t.end()
})

test('looking up commands', function (t) {
  const program = commist()

  function noop1 () {}
  function noop2 () {}
  function noop3 () {}

  program.register('hello', noop1)
  program.register('hello world matteo', noop3)
  program.register('hello world', noop2)

  t.equal(program.lookup('hello')[0].func, noop1)
  t.equal(program.lookup('hello world matteo')[0].func, noop3)
  t.equal(program.lookup('hello world')[0].func, noop2)

  t.end()
})

test('looking up commands with abbreviations', function (t) {
  const program = commist()

  function noop1 () {}
  function noop2 () {}
  function noop3 () {}

  program.register('hello', noop1)
  program.register('hello world matteo', noop3)
  program.register('hello world', noop2)

  t.equal(program.lookup('hel')[0].func, noop1)
  t.equal(program.lookup('hel wor mat')[0].func, noop3)
  t.equal(program.lookup('hel wor')[0].func, noop2)

  t.end()
})

test('looking up strict commands', function (t) {
  const program = commist()

  function noop1 () {}
  function noop2 () {}

  program.register({ command: 'restore', strict: true }, noop1)
  program.register({ command: 'rest', strict: true }, noop2)

  t.equal(program.lookup('restore')[0].func, noop1)
  t.equal(program.lookup('rest')[0].func, noop2)
  t.equal(program.lookup('remove')[0], undefined)

  t.end()
})

test('executing commands from abbreviations', function (t) {
  t.plan(1)

  const program = commist()

  program.register('hello', function (args) {
    t.deepEqual(args, ['a', '-x', '23'])
  })

  program.register('hello world', function (args) {
    t.ok(false, 'must pick the right command')
  })

  program.parse(['hel', 'a', '-x', '23'])
})

test('executing async command', function (t) {
  t.plan(1)

  const program = commist()

  program.register('hello', async function (args) {
    t.deepEqual(args, ['a', '-x', '23'])
  })

  program.parseAsync(['hello', 'a', '-x', '23'])
})

test('async execution resolves when correctly matched one', function (t) {
  t.plan(1)

  const program = commist()

  program.register('hello', async function () {
    return 1337
  })

  program.parseAsync(['hello', 'a', '-x', '23']).then((result) => {
    t.equal(result, null)
  })
})

test('async execution resolves with args if no commands matched', function (t) {
  t.plan(1)

  const program = commist()

  program.register('hello', async function () {
    t.ok(false, 'command should not be picked')
  })

  program.parseAsync(['whoops', 'a', '-x', '23']).then((args) => {
    t.deepEqual(args, ['whoops', 'a', '-x', '23'])
  })
})

test('async execution should wait intil registered command finishes', function (t) {
  t.plan(1)

  const program = commist()

  program.register('hello', async function () {
    const res = await Promise.resolve(42)
    return res
  })

  program.parseAsync(['hello', 'a', '-x', '23']).then((result) => {
    t.equal(result, null)
  })
})

test('async execution should work with sync commands', function (t) {
  t.plan(1)

  const program = commist()

  program.register('hello', function (args) {
    t.deepEqual(args, ['a', '-x', '23'])
  })

  program.parseAsync(['hello', 'a', '-x', '23'])
})

test('sync execution should work with async commands', function (t) {
  t.plan(1)

  const program = commist()

  program.register('hello', async function (args) {
    t.deepEqual(args, ['a', '-x', '23'])
  })

  program.parse(['hello', 'a', '-x', '23'])
})

test('one char command', function (t) {
  const program = commist()

  function noop1 () {}

  program.register('h', noop1)
  t.equal(program.lookup('h')[0].func, noop1)

  t.end()
})

test('two char command', function (t) {
  const program = commist()

  function noop1 () {}

  program.register('he', noop1)
  t.equal(program.lookup('he')[0].func, noop1)

  t.end()
})

test('a command part must be at least 3 chars', function (t) {
  const program = commist()

  function noop1 () {}

  program.register('h b', noop1)

  t.equal(program.lookup('h b')[0].func, noop1)

  t.end()
})

test('short commands match exactly', function (t) {
  const program = commist()

  function noop1 () {}
  function noop2 () {}

  program.register('h', noop1)
  program.register('help', noop2)

  t.equal(program.lookup('h')[0].func, noop1)
  t.equal(program.lookup('he')[0].func, noop2)
  t.equal(program.lookup('hel')[0].func, noop2)
  t.equal(program.lookup('help')[0].func, noop2)

  t.end()
})

test('leven', function (t) {
  t.is(leven('a', 'b'), 1)
  t.is(leven('ab', 'ac'), 1)
  t.is(leven('ac', 'bc'), 1)
  t.is(leven('abc', 'axc'), 1)
  t.is(leven('kitten', 'sitting'), 3)
  t.is(leven('xabxcdxxefxgx', '1ab2cd34ef5g6'), 6)
  t.is(leven('cat', 'cow'), 2)
  t.is(leven('xabxcdxxefxgx', 'abcdefg'), 6)
  t.is(leven('javawasneat', 'scalaisgreat'), 7)
  t.is(leven('example', 'samples'), 3)
  t.is(leven('sturgeon', 'urgently'), 6)
  t.is(leven('levenshtein', 'frankenstein'), 6)
  t.is(leven('distance', 'difference'), 5)
  t.is(leven('因為我是中國人所以我會說中文', '因為我是英國人所以我會說英文'), 2)
  t.end()
})

test('max distance', function (t) {
  const program = commist({ maxDistance: 2 })

  function noop1 () {}
  function noop2 () {}
  function noop3 () {}

  program.register('hello', noop1)
  program.register('hello world matteo', noop3)
  program.register('hello world', noop2)

  t.equal(program.lookup('hel')[0].func, noop1)
  t.equal(program.lookup('hel wor mat')[0].func, noop2)
  t.equal(program.lookup('hello world matt')[0].func, noop3)
  t.equal(program.lookup('hello wor')[0].func, noop2)
  t.deepEqual(program.lookup('he wor'), [])

  t.end()
})

test('help foobar vs start', function (t) {
  const program = commist({ maxDistance: 2 })

  function noop1 () {}
  function noop2 () {}

  program.register('help', noop1)
  program.register('start', noop2)

  t.equal(program.lookup('help')[0].func, noop1)
  t.deepEqual(program.lookup('help foobar')[0].func, noop1)
  t.equal(program.lookup('start')[0].func, noop2)

  t.end()
})

test('registering a command with maxDistance', function (t) {
  t.plan(2)

  const program = commist({ maxDistance: 2 })

  program.register('hello', function (args) {
    t.deepEqual(args, ['a', '-x', '23'])
  })

  const result = program.parse(['hello', 'a', '-x', '23'])

  t.notOk(result, 'must return null, the command have been handled')
})
