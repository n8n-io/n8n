import { foo } from '../fixtures/specifier-external.js'
import Hook from '../../index.js'
import { strictEqual } from 'assert'

Hook((exports, name) => {
  if (name.endsWith('fixtures/specifier-external.js')) {
    exports.foo = 'bar2'
  }
})

strictEqual(foo, 'bar2')
