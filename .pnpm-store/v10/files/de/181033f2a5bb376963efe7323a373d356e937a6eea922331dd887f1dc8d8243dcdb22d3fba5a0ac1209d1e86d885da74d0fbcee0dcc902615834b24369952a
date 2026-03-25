import { strictEqual } from 'assert'

const mod = await import('../fixtures/something.mts')

strictEqual(mod.foo, 42)
strictEqual(typeof mod.bar, 'function')
strictEqual(mod.bar(), 42)
strictEqual(Object.keys(mod).length, 2)
