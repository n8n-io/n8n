'use strict'

const test = require('tape')
const {
  stringArrayToHexStripped,
  removeDotSegments
} = require('../lib/utils')

test('stringArrayToHexStripped', (t) => {
  const testCases = [
    [['0', '0', '0', '0'], ''],
    [['0', '0', '0', '1'], '1'],
    [['0', '0', '1', '0'], '10'],
    [['0', '1', '0', '0'], '100'],
    [['1', '0', '0', '0'], '1000'],
    [['1', '0', '0', '1'], '1001'],
  ]

  t.plan(testCases.length)

  testCases.forEach(([input, expected]) => {
    t.same(stringArrayToHexStripped(input), expected)
  })
})

// Just fixtures, because this function already tested by resolve
test('removeDotSegments', (t) => {
  const testCases = []
  // https://github.com/fastify/fast-uri/issues/139
  testCases.push(['WS:/WS://1305G130505:1&%0D:1&C(XXXXX*)))))))XXX130505:UUVUaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa$aaaaaaaaaaaa13a',
    'WS:/WS://1305G130505:1&%0D:1&C(XXXXX*)))))))XXX130505:UUVUaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa$aaaaaaaaaaaa13a'])

  t.plan(testCases.length)

  testCases.forEach(([input, expected]) => {
    t.same(removeDotSegments(input), expected)
  })
})
