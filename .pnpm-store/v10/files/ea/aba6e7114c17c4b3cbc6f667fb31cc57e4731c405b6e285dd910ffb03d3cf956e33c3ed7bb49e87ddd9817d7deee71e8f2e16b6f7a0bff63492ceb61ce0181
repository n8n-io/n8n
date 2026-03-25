const hyperid = require('..')
const test = require('tape')
const proxyquire = require('proxyquire')

test('require buffer', function (t) {
  t.plan(2)

  const instance = hyperid()
  const id = instance()
  t.ok(id)

  proxyquire('../hyperid', { buffer: { Buffer: null } })
  const instance2 = hyperid()
  const id2 = instance2()
  t.ok(id2)
})
