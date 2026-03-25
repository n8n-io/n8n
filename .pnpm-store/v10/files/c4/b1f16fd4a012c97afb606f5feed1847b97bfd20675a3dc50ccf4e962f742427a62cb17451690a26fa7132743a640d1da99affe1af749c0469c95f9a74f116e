import { register } from 'module'
import Hook from '../../index.js'
import { strictEqual } from 'assert'

register('../../hook.mjs', import.meta.url, { data: { exclude: [/openai/] } })

const hooked = new Set()

Hook((_, name) => {
  hooked.add(name)
})

await import('openai')

strictEqual(hooked.has('openai'), false)
strictEqual(hooked.has('fs'), true)
