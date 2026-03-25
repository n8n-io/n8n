'use strict'

const hyperid = require('..')
const test = require('tape')

test('generating unique ids', function (t) {
  t.plan(1)

  const instance = hyperid()
  const ids = []

  for (let i = 0; i < 2048; i++) {
    const id = instance()

    if (ids.indexOf(id) >= 0) {
      t.fail('duplicate')
      return
    }

    ids.push(id)
  }

  t.pass(ids.length + ' id generated')
})

test('generating unique ids are correct length when fixedLength set to true', function (t) {
  t.plan(1)

  const instance = hyperid(true)

  for (let i = 0; i < 1000000; i++) {
    const id = instance()

    if (id.length !== 33) {
      t.fail('incorrect length')
      return
    }
  }

  t.pass('1000000 id of 33 characters generated')
})

test('generating unique ids are correct length when fixedLength set to true (as option object)', function (t) {
  t.plan(1)

  const instance = hyperid({ fixedLength: true })

  for (let i = 0; i < 1000000; i++) {
    const id = instance()

    if (id.length !== 33) {
      t.fail('incorrect length')
      return
    }
  }

  t.pass('1000000 id of 33 characters generated')
})

test('decode uuids', function (t) {
  t.plan(4)

  const instance = hyperid()

  t.ok(instance.uuid, 'uuid exists')
  t.notEqual(instance.uuid, hyperid().uuid, 'uuid are not equals')

  t.deepEqual(hyperid.decode(instance()), {
    uuid: instance.uuid,
    count: 0
  }, 'decode')

  t.deepEqual(instance.decode(instance()), {
    uuid: instance.uuid,
    count: 1
  }, 'decode from an instance')
})

test('generate url safe ids', function (t) {
  t.plan(1)

  const instance = hyperid({ urlSafe: true })
  const id = instance()

  t.equal(encodeURIComponent(id), id)
})

test('decode url safe ids', function (t) {
  t.plan(1)

  const instance = hyperid({ urlSafe: true })

  t.deepEqual(hyperid.decode(instance(), { urlSafe: true }), {
    uuid: instance.uuid,
    count: 0
  }, 'decode')
})

test('injecting opts.startFrom', function (t) {
  t.plan(1)

  const instance = hyperid({ startFrom: 999999999 })
  const id = instance()

  id.endsWith('999999999')
    ? t.pass('generated as expected')
    : t.fail('did not use injected id')
})

test('opts.fixedLength - passed 999999999 - pads correctly', function (t) {
  t.plan(1)

  const instance = hyperid({ startFrom: 999999999 })
  instance()
  const id = instance()

  id.endsWith('1000000000')
    ? t.pass('generated as expected')
    : t.fail('did not use injected id')
})

test('opts.fixedLength - passed invalid value - throws a friendly error', function (t) {
  t.plan(1)

  try {
    hyperid({ startFrom: 'not a number' })
    t.fail('did not throw an expected error')
  } catch (e) {
    e.message.match(/startFrom must be a number/)
      ? t.pass('thrown as expected')
      : t.fail('this is not the error you\'re looking for')
  }
})

test('opts.maxInt - pass valid value', function (t) {
  t.plan(1)

  const instance = hyperid({
    maxInt: 1
  })

  let firstId = instance()
  let secondId = instance()

  // trimming the uuid and comparing for inequality as maxInt is 1.
  firstId = firstId.substring(0, firstId.length - 1)
  secondId = secondId.substring(0, secondId.length - 1)

  t.doesNotEqual(firstId, secondId)
})

test('opts.maxInt - pass Invalid Value, throws friendly error', function (t) {
  t.plan(1)

  try {
    hyperid({ maxInt: 'not a number' })
    t.fail('did not throw an expected error')
  } catch (e) {
    e.message.match(/maxInt must be a number. recieved/)
      ? t.pass('thrown as expected')
      : t.fail('this is not the error you\'re looking for')
  }
})

test('opts.maxInt - pass valid value with startsFrom EDGE CASE', function (t) {
  t.plan(1)

  const instance = hyperid({
    startFrom: 99999,
    maxInt: 100000
  })

  let firstId = instance()
  let secondId = instance()

  // trimming the uuid and comparing for inequality as maxInt is 1.
  firstId = firstId.substring(0, firstId.length - 1)
  secondId = secondId.substring(0, secondId.length - 1)

  t.doesNotEqual(firstId, secondId)
})

test.only('opts.maxInt - pass valid value, both startFrom and maxInt are equal, throws friendly error EDGE CASE', function (t) {
  t.plan(1)

  try {
    hyperid({ startFrom: 100000, maxInt: 100000 })
    t.fail('did not throw an expected error')
  } catch (e) {
    e.message.match(/startFrom must be a number between 0 and 100000/)
      ? t.pass('thrown as expected')
      : t.fail('this is not the error you\'re looking for')
  }
})
