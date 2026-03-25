// file for microbenchmarking

import { Writer } from './buffer-writer'
import { serialize } from './index'
import { BufferReader } from './buffer-reader'

const LOOPS = 1000
let count = 0
let start = Date.now()
const writer = new Writer()

const reader = new BufferReader()
const buffer = Buffer.from([33, 33, 33, 33, 33, 33, 33, 0])

const run = () => {
  if (count > LOOPS) {
    console.log(Date.now() - start)
    return
  }
  count++
  for (let i = 0; i < LOOPS; i++) {
    reader.setBuffer(0, buffer)
    reader.cstring()
  }
  setImmediate(run)
}

run()
