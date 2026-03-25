import { strictEqual } from 'assert'
import { sep } from 'path'
import * as os from 'node:os'
import { Hook } from '../../index.js'

const hooked = []

Hook((_, name) => {
  hooked.push(name)
})

strictEqual(hooked.length, 2)
strictEqual(hooked[0], 'path')
strictEqual(hooked[1], 'os')
strictEqual(sep, '@')
strictEqual(os.arch(), 'new_crazy_arch')
