import got, { Options } from 'got'
import { strictEqual } from 'assert'
import Hook from '../../index.js'

Hook((exports, name) => {
  if (name === 'got' && 'Options' in exports) {
    exports.Options = 'nothing'
  }
})

strictEqual(typeof got, 'function')
strictEqual(typeof got.post, 'function')
strictEqual(typeof got.stream, 'function')
strictEqual(typeof got.extend, 'function')

strictEqual(Options, 'nothing')
