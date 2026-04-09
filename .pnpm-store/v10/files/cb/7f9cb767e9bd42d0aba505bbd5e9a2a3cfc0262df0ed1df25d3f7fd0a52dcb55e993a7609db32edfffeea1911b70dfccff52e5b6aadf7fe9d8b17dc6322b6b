import { Bench } from 'tinybench'
import { fastUri } from '../index.js'

const {
  equal: fastUriEqual,
  parse: fastUriParse,
} = fastUri

const stringA = 'example://a/b/c/%7Bfoo%7D'
const stringB = 'eXAMPLE://a/./b/../b/%63/%7bfoo%7d'

const componentA = fastUriParse(stringA)
const componentB = fastUriParse(stringB)

const benchFastUri = new Bench({ name: 'fast-uri equal' })

benchFastUri.add('equal string with string', function () {
  fastUriEqual(stringA, stringA)
})

benchFastUri.add('equal component with component', function () {
  fastUriEqual(componentA, componentA)
})

benchFastUri.add('equal component with string', function () {
  fastUriEqual(componentA, stringA)
})

benchFastUri.add('equal string with component', function () {
  fastUriEqual(stringA, componentA)
})

benchFastUri.add('not equal string with string', function () {
  fastUriEqual(stringA, stringB)
})

benchFastUri.add('not equal component with component', function () {
  fastUriEqual(componentA, componentB)
})

benchFastUri.add('not equal component with string', function () {
  fastUriEqual(componentA, stringB)
})

benchFastUri.add('not equal string with component', function () {
  fastUriEqual(stringA, componentB)
})

await benchFastUri.run()
console.log(benchFastUri.name)
console.table(benchFastUri.table())
