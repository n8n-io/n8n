import { register } from 'module'
import { Hook, createAddHookMessageChannel } from '../../index.js'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const fooPath = join(dirname(fileURLToPath(import.meta.url)), 'foo.mjs')

const { registerOptions, waitForAllMessagesAcknowledged } = createAddHookMessageChannel()

register('../../hook.mjs', import.meta.url, registerOptions)

global.hooked = []

Hook([fooPath], (_, name) => {
  global.hooked.push(name)
})

await waitForAllMessagesAcknowledged()
