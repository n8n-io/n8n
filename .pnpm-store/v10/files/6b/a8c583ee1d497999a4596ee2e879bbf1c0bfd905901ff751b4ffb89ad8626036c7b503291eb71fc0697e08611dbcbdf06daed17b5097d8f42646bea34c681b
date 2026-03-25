import { register } from 'module'
import Hook from '../../index.js'
import { strictEqual } from 'assert'

register('../../hook.mjs', import.meta.url, { data: { include: ['node:util', 'os'] } })

const hooked = []

Hook((exports, name) => {
  hooked.push(name)
})

await import('util')
await import('node:os')
await import('fs')
await import('path')

strictEqual(hooked.length, 2)
strictEqual(hooked[0], 'util')
strictEqual(hooked[1], 'os')
