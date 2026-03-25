'use strict'

const getEsmExports = require('../../lib/get-esm-exports.js')
const fs = require('fs')
const assert = require('assert')
const path = require('path')

const fixturePath = path.join(__dirname, '../fixtures/esm-exports.txt')
const fixture = fs.readFileSync(fixturePath, 'utf8')

fixture.split('\n').forEach(line => {
  if (!line.includes(' //| ')) return
  const [mod, testStr] = line.split(' //| ')
  const expectedNames = testStr.split(',').map(x => x.trim())
  if (expectedNames[0] === '') {
    expectedNames.length = 0
  }
  const names = Array.from(getEsmExports(mod))
  assert.deepEqual(expectedNames, names)
  console.log(`${mod}\n  ✅ contains exports: ${testStr}`)
})

// // Generate fixture data
// fixture.split('\n').forEach(line => {
//   if (!line.includes('export ')) {
//     console.log(line)
//     return
//   }
//   const names = getEsmExports(line)
//   console.log(line, '//|', names.join(','))
// })
