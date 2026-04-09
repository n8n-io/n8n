import { Bench } from 'tinybench'
import { wsIsSecure } from '../lib/schemes.js'

const benchWsIsSecure = new Bench({ name: 'wsIsSecure' })

const wsComponentAttributeSecureTrue = {
  scheme: 'ws',
  secure: true,
}

const wsComponentAttributeSecureFalse = {
  scheme: 'ws',
  secure: false,
}

const wssComponent = {
  scheme: 'wss',
}

const wssComponentMixedCase = {
  scheme: 'Wss',
}

const wssComponentUpperCase = {
  scheme: 'WSS',
}

const httpComponent = {
  scheme: 'http',
}

console.assert(wsIsSecure(wsComponentAttributeSecureTrue) === true, 'wsComponentAttributeSecureTrue should be secure')
console.assert(wsIsSecure(wsComponentAttributeSecureFalse) === false, 'wsComponentAttributeSecureFalse should not be secure')
console.assert(wsIsSecure(wssComponent) === true, 'wssComponent should be secure')
console.assert(wsIsSecure(wssComponentMixedCase) === true, 'wssComponentMixedCase should be secure')
console.assert(wsIsSecure(wssComponentUpperCase) === true, 'wssComponentUpperCase should be secure')
console.assert(wsIsSecure(httpComponent) === false, 'httpComponent should not be secure')

benchWsIsSecure.add(JSON.stringify(wsComponentAttributeSecureFalse), function () {
  wsIsSecure(wsComponentAttributeSecureFalse)
})

benchWsIsSecure.add(JSON.stringify(wsComponentAttributeSecureTrue), function () {
  wsIsSecure(wsComponentAttributeSecureTrue)
})

benchWsIsSecure.add(JSON.stringify(wssComponent), function () {
  wsIsSecure(wssComponent)
})

benchWsIsSecure.add(JSON.stringify(wssComponentMixedCase), function () {
  wsIsSecure(wssComponentMixedCase)
})

benchWsIsSecure.add(JSON.stringify(wssComponentUpperCase), function () {
  wsIsSecure(wssComponentUpperCase)
})

benchWsIsSecure.add(JSON.stringify(httpComponent), function () {
  wsIsSecure(httpComponent)
})

await benchWsIsSecure.run()
console.log(benchWsIsSecure.name)
console.table(benchWsIsSecure.table())
