import { foo } from '../fixtures/circular-b.js'
import Hook from '../../index.js'
import { strictEqual } from 'assert'

Hook((exports, name) => {
  if (name.match(/circular-[ab].js/)) {
    exports.foo += 15
  }
})

strictEqual(foo, 57)
