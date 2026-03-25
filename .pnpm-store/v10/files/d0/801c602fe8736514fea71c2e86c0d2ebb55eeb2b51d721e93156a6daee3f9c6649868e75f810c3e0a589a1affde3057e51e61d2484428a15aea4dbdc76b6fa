import { strictEqual } from 'assert'
import Hook from '../../index.js'
Hook((exports, name) => {
  if (/got-alike\.mjs/.test(name) === false) return

  const foo = exports.foo
  exports.foo = foo + '-wrapped'

  const renamedDefaultExport = exports.renamedDefaultExport
  exports.renamedDefaultExport = function bazWrapped () {
    return renamedDefaultExport() + '-wrapped'
  }
})

/* eslint-disable import/no-named-default */
import {
  default as Got,
  foo,
  renamedDefaultExport
} from '../fixtures/got-alike.mjs'

strictEqual(foo, '42-wrapped')
const got = new Got()
strictEqual(got.foo, 'foo')

strictEqual(renamedDefaultExport(), 'baz-wrapped')
