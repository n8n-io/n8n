import Hook from '../../index.js'
import { foo } from '../fixtures/require-root.js'
import { strictEqual } from 'assert'

Hook((exports, name) => {
  if (name.endsWith('require-root.js')) {
    strictEqual(exports.foo, 'something')
    exports.foo += '-wrap'
  }
})

strictEqual(foo, 'something-wrap')
