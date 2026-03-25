import { foo } from '../fixtures/reexport.js'
import Hook from '../../index.js'
import { strictEqual } from 'assert'

Hook((exports, name) => {
  if (name.match(/reexport.js/)) {
    exports.foo += 15
  }
})

strictEqual(foo, 57)
