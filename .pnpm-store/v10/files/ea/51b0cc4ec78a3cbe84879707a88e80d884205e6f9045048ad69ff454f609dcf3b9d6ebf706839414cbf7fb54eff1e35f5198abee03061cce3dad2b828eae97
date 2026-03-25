import Hook from '../../index.js'
import foo from '../fixtures/re-export-cjs-built-in.js'
import foo2 from '../fixtures/re-export-cjs.js'
import foo3 from '../fixtures/re-export-cjs-json.js'
import { deepStrictEqual, strictEqual } from 'assert'

Hook((exports, name) => {
  if (name.endsWith('fixtures/re-export-cjs-built-in.js')) {
    strictEqual(typeof exports.default, 'function')
    exports.default = '1'
  }

  if (name.endsWith('fixtures/re-export-cjs.js')) {
    strictEqual(exports.default, 'bar')
    exports.default = '2'
  }

  if (name.endsWith('fixtures/re-export-cjs-json.js')) {
    deepStrictEqual(exports.default, { data: 'dog' })
    exports.default = '3'
  }
})

strictEqual(foo, '1')
strictEqual(foo2, '2')
strictEqual(foo3, '3')
