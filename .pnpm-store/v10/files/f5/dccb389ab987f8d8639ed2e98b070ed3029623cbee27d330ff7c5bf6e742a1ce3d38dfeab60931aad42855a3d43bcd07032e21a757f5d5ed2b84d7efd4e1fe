import assert from 'node:assert/strict'
import defaultHook, { Hook, addHook } from '../../index.js'
import { sayHi } from '../fixtures/say-hi.mjs'

addHook((url, exported) => {
  if (url.toLowerCase().endsWith('say-hi.mts')) {
    exported.sayHi = () => 'Hooked'
  }
})

new defaultHook((exported: any, name: string, baseDir: string|void)  => {

});

new Hook((exported: any, name: string, baseDir: string|void)  => {

});

assert.equal(sayHi('test'), 'Hooked')
