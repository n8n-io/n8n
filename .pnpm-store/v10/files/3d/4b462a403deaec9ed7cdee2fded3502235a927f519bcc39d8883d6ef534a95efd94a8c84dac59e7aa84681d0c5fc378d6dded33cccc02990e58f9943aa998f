import { createRequire } from 'node:module'
import * as process from 'node:process'

// prettier-ignore
if (globalThis.Deno) {
  globalThis.require = createRequire(import.meta.url)
  globalThis.__filename = new URL(import.meta.url).pathname
  globalThis.__dirname = new URL('.', import.meta.url).pathname
  globalThis.module = new Proxy({}, { set() { return true } })

  const p = globalThis.process = globalThis.process || process
  p.version || (p.version = 'v18.0.0')
  p.version || (p.version = { node: '18.0.0' })
  p.env || (p.env = globalThis.Deno.env.toObject())
  p.argv || (p.argv = [globalThis.Deno.execPath(), globalThis.Deno.mainModule.replace('file://', ''), ...globalThis.Deno.args])
}
