import { register } from 'module'
import Hook from '../../index.js'
import { strictEqual } from 'assert'

register('../../hook.mjs', import.meta.url, { data: { exclude: ['util'] } })

const hooked = []

Hook((exports, name) => {
  hooked.push(name)
})

await import('openai')

strictEqual(hooked.includes('util'), false)
