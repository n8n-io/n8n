import Hook from '../../index.js'
import { foo } from '../fixtures/re-export-star-external.mjs'
import { bar } from '../fixtures/sub-directory/re-export-star-external.mjs'
import { strictEqual } from 'assert'

Hook((exports, name) => {
  if (name.endsWith('fixtures/re-export-star-external.mjs')) {
    exports.foo = '1'
  }

  if (name.endsWith('fixtures/sub-directory/re-export-star-external.mjs')) {
    exports.bar = '2'
  }
})

strictEqual(foo, '1')
strictEqual(bar, '2')
