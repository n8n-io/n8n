import * as lib from '../fixtures/duplicate-explicit.mjs'
import { strictEqual } from 'assert'
import Hook from '../../index.js'

Hook((exports, name) => {
  if (name.endsWith('duplicate-explicit.mjs')) {
    strictEqual(exports.foo, 'c')
    exports.foo += '-wrapped'
  }
})

// foo should not be exported because there are duplicate exports
strictEqual(lib.foo, 'c-wrapped')
