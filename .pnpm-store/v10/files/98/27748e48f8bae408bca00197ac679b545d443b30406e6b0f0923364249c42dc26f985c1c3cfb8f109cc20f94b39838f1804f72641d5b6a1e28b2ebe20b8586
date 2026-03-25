import { strictEqual } from 'assert'
import * as foo from './foo.mjs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const fooPath = join(dirname(fileURLToPath(import.meta.url)), 'foo.mjs')

strictEqual(typeof foo.foo, 'function')
strictEqual(global.hooked.length, 1)
strictEqual(global.hooked[0], fooPath)
