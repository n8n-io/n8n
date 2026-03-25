import { fileURLToPath } from 'url'
import { join } from 'path'
import { strictEqual } from 'assert'
import Hook from '../../index.js'

const toWrap = join(fileURLToPath(import.meta.url), '..', '..', 'fixtures', 'foo.mjs')

Hook([toWrap], (exports) => {
  const original = exports.foo
  exports.foo = function foo () {
    return original() + '-first'
  }
})

Hook([toWrap], (exports) => {
  const original = exports.foo
  exports.foo = function foo () {
    return original() + '-second'
  }
})

Hook([toWrap], (exports) => {
  const shouldNotExist = exports.default
  exports = function () {
    return shouldNotExist()
  }
})

const imp = await import('../fixtures/foo.mjs')

strictEqual(imp.foo(), 'foo-first-second')
// This should not throw!
strictEqual(imp.default, undefined)
