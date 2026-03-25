import Hook from '../../index.js'
import { Report } from 'c8'
import path from 'path'
import { fileURLToPath } from 'url'
import { strictEqual } from 'assert'

const c8Dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'node_modules', 'c8')

Hook(['c8'], (exports, name, baseDir) => {
  strictEqual(name, 'c8')
  strictEqual(baseDir, c8Dir)
  exports.Report = () => 42
})

strictEqual(Report({}), 42)
