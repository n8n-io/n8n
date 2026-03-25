import { register } from 'module'
import Hook from '../../index.js'
import { strictEqual } from 'assert'

register('../../hook.mjs', import.meta.url, { data: { experimentalPatchInternals: true } })

Hook(['c8'], (exports, name) => {
  strictEqual(name, 'c8')
  exports.Report = () => 42
})

const { Report } = await import('c8/index.js')

strictEqual(Report({}), 42)
