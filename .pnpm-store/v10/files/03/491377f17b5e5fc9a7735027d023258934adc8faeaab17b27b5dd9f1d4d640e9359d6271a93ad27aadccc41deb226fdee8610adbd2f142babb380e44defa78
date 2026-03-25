import { foo } from '../fixtures/nested-folder/specifier.js'
import Hook from '../../index.js'
import { strictEqual } from 'assert'

Hook((exports, name) => {
  if (name.endsWith('fixtures/nested-folder/specifier.js')) {
    exports.foo = 1
  }
})

strictEqual(foo, 1)
