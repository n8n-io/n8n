import { Bench } from 'tinybench'
import { nonSimpleDomain } from '../lib/utils.js'

const benchNonSimpleDomain = new Bench({ name: 'nonSimpleDomain' })

const exampleCom = 'example.com'
const exaumlmpleCom = 'exämple.com'
const longDomain = 'abc'.repeat(100) + '.com'

console.assert(nonSimpleDomain(exampleCom) === false, 'example.com should be a simple domain')
console.assert(nonSimpleDomain(exaumlmpleCom) === true, 'exämple.com should not be a simple domain')
console.assert(nonSimpleDomain(longDomain) === false, `${longDomain} should be a simple domain?`)

benchNonSimpleDomain.add('nonSimpleDomain', function () {
  nonSimpleDomain(exampleCom)
  nonSimpleDomain(exaumlmpleCom)
  nonSimpleDomain(longDomain)
})

await benchNonSimpleDomain.run()
console.log(benchNonSimpleDomain.name)
console.table(benchNonSimpleDomain.table())
