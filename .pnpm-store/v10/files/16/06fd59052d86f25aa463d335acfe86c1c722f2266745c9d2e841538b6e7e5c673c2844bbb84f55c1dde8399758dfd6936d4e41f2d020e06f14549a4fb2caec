import { strictEqual } from 'assert'
import Hook from '../../index.js'

/* eslint-disable import/first */
import {
  /* eslint-disable import/no-named-default */
  default as bar,
  foo,
  aFunc,
  baz
} from '../fixtures/bundle.mjs'
Hook((exports, name) => {
  if (/bundle\.mjs/.test(name) === false) return

  const bar = exports.default
  exports.default = function wrappedBar () {
    return bar() + '-wrapped'
  }

  const foo = exports.foo
  exports.foo = function wrappedFoo () {
    return foo() + '-wrapped'
  }

  const aFunc = exports.aFunc
  exports.aFunc = function wrappedAFunc () {
    return aFunc() + '-wrapped'
  }
})

strictEqual(bar(), '42-wrapped')
strictEqual(foo(), 'foo-wrapped')
strictEqual(aFunc(), 'a-wrapped')
strictEqual(baz(), 'baz')
