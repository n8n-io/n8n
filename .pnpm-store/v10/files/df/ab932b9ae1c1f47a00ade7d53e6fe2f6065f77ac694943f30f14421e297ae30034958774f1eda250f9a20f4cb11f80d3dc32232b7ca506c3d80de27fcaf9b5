import { register } from 'module'
import Hook from '../../index.js'
import { strictEqual } from 'assert'

register('../../hook.mjs', import.meta.url, { data: { include: ['openai'] } })

const hooked = []

Hook((exports, name) => {
  hooked.push(name)
})

await import('openai')

strictEqual(hooked.length, 1)
strictEqual(hooked[0], 'openai')
