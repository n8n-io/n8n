import { foo } from '../fixtures/specifier-string.js'
import Hook from '../../index.js'
import { strictEqual } from 'assert'

Hook((exports, name) => {
  if (name.endsWith('fixtures/specifier-string.js')) {
    exports.foo = 1
  }
})

strictEqual(foo, 1)
