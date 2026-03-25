import { foo } from '../fixtures/specifier.mjs'
import Hook from '../../index.js'
import { strictEqual } from 'assert'
Hook((exports, name) => {
  if (name.endsWith('fixtures/specifier.mjs')) {
    exports.foo = 1
  }
})

strictEqual(foo, 1)
