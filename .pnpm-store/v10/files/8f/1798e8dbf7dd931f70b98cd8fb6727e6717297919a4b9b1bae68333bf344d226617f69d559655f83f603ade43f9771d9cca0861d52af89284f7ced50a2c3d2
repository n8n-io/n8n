'use strict'

const hyperid = require('..')
const test = require('tape')
const BloomFilter = require('bloomfilter').BloomFilter
const maxInt = Math.pow(2, 31) - 1

test('uniqueness', function (t) {
  t.plan(3)

  const instance = hyperid()
  const bloom = new BloomFilter(
    32 * 4096 * 4096, // number of bits to allocate.
    16 // number of hash functions.
  )

  let conflicts = 0
  let ids = 0

  const max = maxInt * 2

  for (let i = 0; i < max; i += Math.ceil(Math.random() * 4096)) {
    const id = instance()

    if (bloom.test(id)) {
      conflicts++
    }

    ids++

    bloom.add(id)
  }

  t.pass(ids + ' id generated')
  t.pass(conflicts + ' bloom filter conflicts')
  t.ok(conflicts / ids < 0.001, '0,1% conflict ratio using bloom filters')
})

test('url safe uniqueness', function (t) {
  t.plan(3)

  const instance = hyperid({ urlSafe: true })
  const bloom = new BloomFilter(
    32 * 4096 * 4096, // number of bits to allocate.
    16 // number of hash functions.
  )

  let conflicts = 0
  let ids = 0

  const max = maxInt * 2

  for (let i = 0; i < max; i += Math.ceil(Math.random() * 4096)) {
    const id = instance()

    if (bloom.test(id)) {
      conflicts++
    }

    ids++

    bloom.add(id)
  }

  t.pass(ids + ' id generated')
  t.pass(conflicts + ' bloom filter conflicts')
  t.ok(conflicts / ids < 0.001, '0,1% conflict ratio using bloom filters')
})
