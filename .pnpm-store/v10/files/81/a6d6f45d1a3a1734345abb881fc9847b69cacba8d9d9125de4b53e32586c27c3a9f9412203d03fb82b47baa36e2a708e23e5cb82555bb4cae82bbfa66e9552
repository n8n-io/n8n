import { register } from 'module'
import Hook from '../../index.js'
import { strictEqual } from 'assert'

register('../../hook.mjs', import.meta.url)

let bar

Hook((exports, name) => {
  if (name.match(/circular-b.mjs/)) {
    bar = exports.bar
  }
})

await import('../fixtures/circular-b.mjs')

strictEqual(bar, 2)
